import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import { getCanonicalOrigin } from "./origins";
import { formatTokenAmount } from "./tokens";

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), "../emails");

const cache = new Map<string, string>();

function loadTemplate(name: string) {
  const hit = cache.get(name);
  if (hit) return hit;
  const html = readFileSync(join(TEMPLATES_DIR, name), "utf8");
  cache.set(name, html);
  return html;
}

/** Titles and display names are user-chosen, so every value is escaped. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render(name: string, vars: Record<string, string>) {
  let html = loadTemplate(name);
  html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) =>
    vars[key] ? inner : "",
  );
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? ""));
}

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export function emailFrom() {
  return process.env.EMAIL_FROM || "LNOC <noreply@lnoc.xyz>";
}

export function appOrigin() {
  return getCanonicalOrigin();
}

export function listingUrl(id: string) {
  return `${appOrigin()}/listings/${id}`;
}

export function chatUrl(conversationId: string) {
  return `${appOrigin()}/chat?c=${encodeURIComponent(conversationId)}`;
}

async function send(to: string, subject: string, name: string, vars: Record<string, string>) {
  const resend = client();
  const html = render(name, vars);
  if (!resend) {
    const code = vars.code ? ` code=${vars.code}` : "";
    console.warn(`[email] RESEND_API_KEY unset — skipped "${subject}" to ${to}${code}`);
    return { skipped: true as const };
  }
  const { error } = await resend.emails.send({
    from: emailFrom(),
    to,
    subject,
    html,
  });
  if (error) {
    console.error(`[email] failed "${subject}" to ${to}:`, error);
    throw new Error(error.message || "Failed to send email");
  }
  return { skipped: false as const };
}

export function sendWelcome(to: string, username?: string | null) {
  return send(to, "Welcome to LNOC", "welcome.html", {
    username: username ?? "",
    appUrl: appOrigin(),
  });
}

export function sendOtp(to: string, code: string) {
  return send(to, "Your LNOC verification code", "otp.html", { email: to, code });
}

/** Amounts are in the listing's own token, so every email names it. */
type Priced = { currency: string };

export function sendOutbid(
  to: string,
  input: Priced & { title: string; listingId: string; previousBid: number; newBid: number },
) {
  return send(to, `Outbid on ${input.title}`, "outbid.html", {
    title: input.title,
    previousBid: formatTokenAmount(input.previousBid, input.currency),
    newBid: formatTokenAmount(input.newBid, input.currency),
    listingUrl: listingUrl(input.listingId),
  });
}

/**
 * The other side of a sale and the thread already opened with them. `chatUrl`
 * is null when the thread could not be written; the email then goes out
 * without the chat button rather than not at all.
 */
type Counterpart = { counterpartName: string; chatUrl: string | null };

export function sendAuctionWon(
  to: string,
  input: Priced & Counterpart & { title: string; listingId: string; amount: number },
) {
  return send(to, `You won ${input.title}`, "auction-won.html", {
    title: input.title,
    amount: formatTokenAmount(input.amount, input.currency),
    listingUrl: listingUrl(input.listingId),
    counterpartName: input.counterpartName,
    chatUrl: input.chatUrl ?? "",
  });
}

export function sendListingPurchased(
  to: string,
  input: Priced & Counterpart & { title: string; listingId: string; amount: number },
) {
  return send(to, `Purchase confirmed: ${input.title}`, "listing-purchased.html", {
    title: input.title,
    amount: formatTokenAmount(input.amount, input.currency),
    listingUrl: listingUrl(input.listingId),
    counterpartName: input.counterpartName,
    chatUrl: input.chatUrl ?? "",
  });
}

/** To the seller, for either kind of sale. */
export function sendListingSold(
  to: string,
  input: Priced &
    Counterpart & { title: string; listingId: string; amount: number; via: "purchase" | "auction" },
) {
  const won = input.via === "auction";
  const subject = won ? `Your auction for ${input.title} has a winner` : `You sold ${input.title}`;
  return send(to, subject, "listing-sold.html", {
    heading: won ? "Your auction has a winner" : "You made a sale",
    verb: won ? "won your auction for" : "bought",
    title: input.title,
    amount: formatTokenAmount(input.amount, input.currency),
    listingUrl: listingUrl(input.listingId),
    counterpartName: input.counterpartName,
    chatUrl: input.chatUrl ?? "",
  });
}
