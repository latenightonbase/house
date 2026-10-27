import { createWebhook, listWebhooks } from "../lib/calendly";

/**
 * Registers the API's Calendly webhook, once per deployment:
 *
 *   bun run calls:webhook https://api.example.com
 *
 * The origin defaults to API_ORIGIN. The subscription is signed with
 * CALENDLY_WEBHOOK_SIGNING_KEY, which the API must also have. Calendly only
 * offers webhooks on paid plans; without one, bookings are still recorded from
 * the embed, but cancellations made in Calendly won't free the payment up.
 */

const origin = (process.argv[2] || process.env.API_ORIGIN || "").replace(/\/+$/, "");
const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY?.trim();

if (!/^https:\/\//.test(origin)) {
  throw new Error("Pass the API's public https origin, e.g. bun run calls:webhook https://api.example.com");
}
if (!signingKey) {
  throw new Error("CALENDLY_WEBHOOK_SIGNING_KEY is unset");
}

const url = `${origin}/webhooks/calendly`;
const existing = (await listWebhooks()).find((w) => w.callback_url === url);
if (existing) {
  console.log(`Already subscribed: ${existing.uri} (${existing.state}) → ${url}`);
  console.log("Delete it in Calendly first if the signing key changed.");
} else {
  console.log(`Subscribed ${await createWebhook(url, signingKey)} → ${url}`);
}
