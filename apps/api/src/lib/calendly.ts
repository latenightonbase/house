import { createHmac, timingSafeEqual } from "crypto";

/**
 * The slice of Calendly's v2 API that paid calls need: find Bill's event type,
 * mint single-use scheduling links on it, read an invitee back, and check the
 * signature on webhook deliveries.
 *
 * Auth is a Personal Access Token (`CALENDLY_TOKEN`) from the account that
 * owns the event. It needs `scheduling_links:write`, `event_types:read`,
 * `scheduled_events:read`, `users:read` and, for the webhook script,
 * `webhooks:write`.
 */

const API = "https://api.calendly.com";

/** The public page for the call. Used to find the event type when no URI is configured. */
export const DEFAULT_CALL_PAGE = "https://calendly.com/bill-latenightonbase/30min";

export function calendlyConfigured() {
  return Boolean(process.env.CALENDLY_TOKEN?.trim());
}

function callPage() {
  return (process.env.CALENDLY_CALL_PAGE?.trim() || DEFAULT_CALL_PAGE).replace(/\/+$/, "");
}

async function calendly<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.CALENDLY_TOKEN?.trim();
  if (!token) throw new Error("CALENDLY_TOKEN is not set");
  const url = path.startsWith("https://") ? path : `${API}${path}`;
  if (!url.startsWith(`${API}/`)) throw new Error("Refusing a non-Calendly URL");
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: init.signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Calendly ${res.status} on ${path}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

type CalendlyUser = { resource: { uri: string; current_organization: string } };

export async function currentUser() {
  const { resource } = await calendly<CalendlyUser>("/users/me");
  return resource;
}

type EventTypePage = {
  collection: Array<{ uri: string; scheduling_url: string; active: boolean }>;
  pagination: { next_page: string | null };
};

let eventTypeUri: string | null = process.env.CALENDLY_EVENT_TYPE_URI?.trim() || null;

/**
 * The event type behind the call page. Set `CALENDLY_EVENT_TYPE_URI` to skip
 * the lookup; otherwise it is found once by matching its scheduling URL and
 * kept for the life of the process.
 */
export async function callEventType(): Promise<string> {
  if (eventTypeUri) return eventTypeUri;
  const user = await currentUser();
  const want = callPage().toLowerCase();
  let next: string | null = `/event_types?user=${encodeURIComponent(user.uri)}&count=100`;
  while (next) {
    const page: EventTypePage = await calendly<EventTypePage>(next);
    const match = page.collection.find(
      (e) => e.scheduling_url.replace(/\/+$/, "").toLowerCase() === want,
    );
    if (match) {
      eventTypeUri = match.uri;
      return match.uri;
    }
    next = page.pagination.next_page;
  }
  throw new Error(`No Calendly event type has the scheduling URL ${callPage()}`);
}

/** A link that books exactly one event, then stops working. */
export async function createSingleUseLink(): Promise<string> {
  const owner = await callEventType();
  const { resource } = await calendly<{ resource: { booking_url: string } }>(
    "/scheduling_links",
    {
      method: "POST",
      body: JSON.stringify({ max_event_count: 1, owner, owner_type: "EventType" }),
    },
  );
  return resource.booking_url;
}

/** The fields of an invitee that a booking records. Same shape in the API and in webhooks. */
export type CalendlyInvitee = {
  uri: string;
  email: string;
  name: string;
  status: "active" | "canceled";
  /** The scheduled event's URI. */
  event: string;
  cancel_url: string;
  reschedule_url: string;
  rescheduled: boolean;
  old_invitee: string | null;
  new_invitee: string | null;
  tracking: {
    utm_campaign: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_content: string | null;
    utm_term: string | null;
  } | null;
};

export type CalendlyScheduledEvent = {
  uri: string;
  status: "active" | "canceled";
  start_time: string;
  end_time: string;
  event_type: string;
};

export async function getInvitee(uri: string) {
  const { resource } = await calendly<{ resource: CalendlyInvitee }>(uri);
  return resource;
}

export async function getScheduledEvent(uri: string) {
  const { resource } = await calendly<{ resource: CalendlyScheduledEvent }>(uri);
  return resource;
}

/** Calendly's documented replay window. */
const SIGNATURE_TOLERANCE_S = 180;

/**
 * Checks a `Calendly-Webhook-Signature: t=<unix>,v1=<hex>` header against the
 * raw body — HMAC-SHA256 of `${t}.${body}` with the subscription's signing key.
 */
export function verifyWebhookSignature(rawBody: string, header: string | null): boolean {
  const key = process.env.CALENDLY_WEBHOOK_SIGNING_KEY?.trim();
  if (!key || !header) return false;
  const parts = new Map(
    header.split(",").map((part) => {
      const at = part.indexOf("=");
      return [part.slice(0, at).trim(), part.slice(at + 1).trim()] as const;
    }),
  );
  const t = parts.get("t");
  const v1 = parts.get("v1");
  if (!t || !v1 || !/^\d+$/.test(t)) return false;

  const age = Math.floor(Date.now() / 1000) - Number(t);
  if (age > SIGNATURE_TOLERANCE_S || age < -SIGNATURE_TOLERANCE_S) return false;

  const expected = createHmac("sha256", key).update(`${t}.${rawBody}`, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

type WebhookPage = {
  collection: Array<{ uri: string; callback_url: string; events: string[]; state: string }>;
};

/** The user-scoped webhook subscriptions on the token's account. */
export async function listWebhooks() {
  const user = await currentUser();
  const qs = new URLSearchParams({
    organization: user.current_organization,
    user: user.uri,
    scope: "user",
    count: "100",
  });
  const { collection } = await calendly<WebhookPage>(`/webhook_subscriptions?${qs}`);
  return collection;
}

/** Subscribes `url` to bookings and cancellations on the token's own calendar. */
export async function createWebhook(url: string, signingKey: string) {
  const user = await currentUser();
  const { resource } = await calendly<{ resource: { uri: string } }>("/webhook_subscriptions", {
    method: "POST",
    body: JSON.stringify({
      url,
      events: ["invitee.created", "invitee.canceled"],
      organization: user.current_organization,
      user: user.uri,
      scope: "user",
      signing_key: signingKey,
    }),
  });
  return resource.uri;
}
