import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), "../emails");

const cache = new Map<string, string>();

function loadTemplate(name: string) {
  const hit = cache.get(name);
  if (hit) return hit;
  const html = readFileSync(join(TEMPLATES_DIR, name), "utf8");
  cache.set(name, html);
  return html;
}

function render(name: string, vars: Record<string, string>) {
  let html = loadTemplate(name);
  html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) =>
    vars[key] ? inner : "",
  );
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
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
  return process.env.APP_ORIGIN || "http://localhost:3002";
}

export function listingUrl(id: string) {
  return `${appOrigin()}/listings/${id}`;
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

export function sendOutbid(to: string, input: { title: string; listingId: string; previousBid: number; newBid: number }) {
  return send(to, `Outbid on ${input.title}`, "outbid.html", {
    title: input.title,
    previousBid: input.previousBid.toLocaleString(),
    newBid: input.newBid.toLocaleString(),
    listingUrl: listingUrl(input.listingId),
  });
}

export function sendAuctionWon(to: string, input: { title: string; listingId: string; amount: number }) {
  return send(to, `You won ${input.title}`, "auction-won.html", {
    title: input.title,
    amount: input.amount.toLocaleString(),
    listingUrl: listingUrl(input.listingId),
  });
}

export function sendListingPurchased(to: string, input: { title: string; listingId: string; amount: number }) {
  return send(to, `Purchase confirmed: ${input.title}`, "listing-purchased.html", {
    title: input.title,
    amount: input.amount.toLocaleString(),
    listingUrl: listingUrl(input.listingId),
  });
}
