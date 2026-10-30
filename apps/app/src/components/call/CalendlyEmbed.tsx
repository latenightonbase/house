"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const WIDGET_JS = "https://assets.calendly.com/assets/external/widget.js";
const WIDGET_CSS = "https://assets.calendly.com/assets/external/widget.css";

type CalendlyWidget = {
  initInlineWidget(options: {
    url: string;
    parentElement: HTMLElement;
    prefill?: { name?: string; email?: string };
    utm?: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string };
  }): void;
};

declare global {
  interface Window {
    Calendly?: CalendlyWidget;
  }
}

let loader: Promise<CalendlyWidget> | null = null;

/** Calendly's embed script, added to the page once however many embeds mount. */
function loadCalendly(): Promise<CalendlyWidget> {
  if (window.Calendly) return Promise.resolve(window.Calendly);
  loader ??= new Promise<CalendlyWidget>((resolve, reject) => {
    if (!document.querySelector(`link[href="${WIDGET_CSS}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = WIDGET_CSS;
      document.head.appendChild(css);
    }
    const script = document.createElement("script");
    script.src = WIDGET_JS;
    script.async = true;
    script.onload = () =>
      window.Calendly ? resolve(window.Calendly) : reject(new Error("Calendly did not load"));
    script.onerror = () => {
      loader = null;
      script.remove();
      reject(new Error("Calendly did not load"));
    };
    document.body.appendChild(script);
  });
  return loader;
}

type ScheduledMessage = {
  event: "calendly.event_scheduled";
  payload: { event: { uri: string }; invitee: { uri: string } };
};

function isScheduled(data: unknown): data is ScheduledMessage {
  const d = data as Partial<ScheduledMessage> | null;
  return d?.event === "calendly.event_scheduled" && typeof d.payload?.invitee?.uri === "string";
}

/**
 * Calendly's inline scheduler for one single-use link. The booking id rides
 * along as `utm_content`, which is how the API ties the Calendly invitee — and
 * any later webhook about it — back to the payment. `campaign` says which way
 * in the caller came (a plain call, a guest spot, a sponsorship) and shows on
 * the booking in Calendly.
 */
export function CalendlyEmbed({
  url,
  bookingId,
  campaign,
  name,
  email,
  onScheduled,
}: {
  url: string;
  bookingId: string;
  campaign: string;
  name?: string | null;
  email?: string | null;
  onScheduled: (inviteeUri: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const onScheduledRef = useRef(onScheduled);
  onScheduledRef.current = onScheduled;

  useEffect(() => {
    let cancelled = false;
    const parent = ref.current;
    if (!parent) return;
    setState("loading");
    loadCalendly()
      .then((Calendly) => {
        if (cancelled) return;
        parent.replaceChildren();
        const link = new URL(url);
        link.searchParams.set("hide_gdpr_banner", "1");
        // Calendly's colour parameters, so the scheduler sits on the dark card
        // instead of a white slab. Plans without custom colours ignore them.
        link.searchParams.set("background_color", "0b0710");
        link.searchParams.set("text_color", "f5f3ff");
        link.searchParams.set("primary_color", "34d399");
        Calendly.initInlineWidget({
          url: link.toString(),
          parentElement: parent,
          prefill: {
            ...(name ? { name } : {}),
            ...(email ? { email } : {}),
          },
          utm: { utmSource: "lnoc", utmMedium: "paid-call", utmCampaign: campaign, utmContent: bookingId },
        });
        setState("ready");
      })
      .catch(() => !cancelled && setState("failed"));
    return () => {
      cancelled = true;
      parent.replaceChildren();
    };
  }, [url, bookingId, campaign, name, email]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://calendly.com") return;
      if (isScheduled(event.data)) onScheduledRef.current(event.data.payload.invitee.uri);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Opened outside the embed, the link still has to carry the booking id.
  const direct = new URL(url);
  direct.searchParams.set("utm_source", "lnoc");
  direct.searchParams.set("utm_medium", "paid-call");
  direct.searchParams.set("utm_campaign", campaign);
  direct.searchParams.set("utm_content", bookingId);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface">
      {state !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-2 p-6 text-center text-[13px] text-caption">
          {state === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading the calendar" />
          ) : (
            <p>
              The calendar didn&apos;t load.{" "}
              <a href={direct.toString()} target="_blank" rel="noreferrer" className="text-primary-bright underline">
                Open it on Calendly
              </a>{" "}
              instead — your link works once.
            </p>
          )}
        </div>
      )}
      <div ref={ref} className="h-[700px] min-w-[300px] sm:h-[680px]" />
    </div>
  );
}
