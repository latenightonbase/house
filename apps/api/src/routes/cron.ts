import { Elysia } from "elysia";
import { settleExpiredAuctions } from "../lib/auctionSettlement";

function cronAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-cron-secret");
  return Boolean(expected && token === expected);
}

async function runSettlementCron({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string };
}) {
  if (!cronAuthorized(request)) {
    set.status = 401;
    return { error: "Unauthorized" };
  }

  try {
    return { ok: true, auctions: await settleExpiredAuctions() };
  } catch (err) {
    set.status = 500;
    return { error: err instanceof Error ? err.message : "Settlement failed" };
  }
}

/**
 * Settles expired auctions on demand. Safe to hit often — the API's own ticker
 * already runs the same sweep every minute. GET is here so Railway / Vercel
 * cron can ping a URL without a body.
 */
export const cronRoutes = new Elysia({ prefix: "/internal" })
  .get("/cron/settle-auctions", runSettlementCron)
  .post("/cron/settle-auctions", runSettlementCron);
