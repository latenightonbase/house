import { Elysia, t } from "elysia";
import { getUserFromRequest } from "../lib/session";
import { verifyWebhookSignature, type CalendlyInvitee } from "../lib/calendly";
import {
  CALL_MINUTES,
  CallError,
  applyInviteeWebhook,
  callPrices,
  callRecipient,
  callsUnavailableReason,
  confirmCallPayment,
  confirmScheduled,
  ensureSchedulingLink,
  listCallBookings,
  orderCall,
  publicCallBooking,
} from "../lib/calls";

type Setter = { status?: number | string };

function fail(set: Setter, err: unknown, fallback: string) {
  if (err instanceof CallError) {
    set.status = err.status;
    return { error: err.message };
  }
  console.error(`[calls] ${fallback}:`, err);
  set.status = 500;
  return { error: fallback };
}

/**
 * Pay-then-book calls with Bill. `/calls/*` is the caller's side; Calendly
 * posts to `/webhooks/calendly` when a call is booked, moved or cancelled.
 */
export const callRoutes = new Elysia()
  /** What a call costs and where the money goes — public, so the page renders signed out. */
  .get("/calls/config", () => {
    const unavailable = callsUnavailableReason();
    if (unavailable) console.warn(`[calls] booking closed: ${unavailable}`);
    return {
      available: unavailable === null,
      minutes: CALL_MINUTES,
      recipient: callRecipient(),
      prices: callPrices().map(({ token, amount }) => ({
        token: { address: token.address, symbol: token.symbol, decimals: token.decimals },
        amount,
      })),
    };
  })
  .get("/calls/mine", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }
    const bookings = await listCallBookings(user.id);
    // A paid booking whose link is missing (a Calendly hiccup, or a cancelled
    // call) gets one here so the page can go straight to the calendar.
    const ready = await Promise.all(
      bookings.map((b) => ensureSchedulingLink(b).catch(() => b)),
    );
    return { bookings: ready.map(publicCallBooking) };
  })
  .post(
    "/calls",
    async ({ request, body, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Sign in to book a call." };
      }
      try {
        const booking = await orderCall(user.id, body.tokenAddress);
        return { booking: publicCallBooking(booking) };
      } catch (err) {
        return fail(set, err, "Couldn't start the booking.");
      }
    },
    { body: t.Object({ tokenAddress: t.String({ maxLength: 64 }) }) },
  )
  .post(
    "/calls/:id/confirm",
    async ({ request, params, body, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }
      let paid;
      try {
        paid = await confirmCallPayment(user.id, params.id, body.txHash);
      } catch (err) {
        return fail(set, err, "Couldn't verify the payment.");
      }
      // Paid either way; a Calendly failure here is retried by `/calls/mine`.
      const booking = await ensureSchedulingLink(paid).catch((err) => {
        console.error("[calls] scheduling link:", err);
        return paid;
      });
      return { booking: publicCallBooking(booking) };
    },
    { body: t.Object({ txHash: t.String({ maxLength: 80 }) }) },
  )
  .post(
    "/calls/:id/scheduled",
    async ({ request, params, body, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }
      try {
        const booking = await confirmScheduled(user.id, params.id, body.inviteeUri);
        return { booking: publicCallBooking(booking) };
      } catch (err) {
        return fail(set, err, "Couldn't record the booking.");
      }
    },
    { body: t.Object({ inviteeUri: t.String({ maxLength: 300 }) }) },
  )
  .post(
    "/webhooks/calendly",
    async ({ request, body, set }) => {
      // The signature covers the exact bytes Calendly sent, so the body is
      // taken as text and parsed only after it checks out.
      if (!verifyWebhookSignature(body, request.headers.get("calendly-webhook-signature"))) {
        set.status = 401;
        return { error: "Bad signature" };
      }
      let event: { event?: string; payload?: CalendlyInvitee };
      try {
        event = JSON.parse(body);
      } catch {
        set.status = 400;
        return { error: "Bad JSON" };
      }
      if (!event.event || !event.payload?.uri) return { ok: true, result: "ignored" };
      try {
        return { ok: true, result: await applyInviteeWebhook(event.event, event.payload) };
      } catch (err) {
        // A 5xx makes Calendly retry, which is what a transient failure wants.
        console.error("[calls] webhook:", err);
        set.status = 500;
        return { error: "Webhook failed" };
      }
    },
    { parse: "text", body: t.String() },
  );
