import { Elysia } from "elysia";
import { settleAndRolloverDailyAuction } from "../lib/dailyAuction";

function cronAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-cron-secret");
  return Boolean(expected && token === expected);
}

async function runDailyAuctionCron({
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
    const result = await settleAndRolloverDailyAuction();
    if ("ok" in result && result.ok === false) {
      set.status = 500;
      return { error: result.error, result };
    }
    return { ok: true, result };
  } catch (err) {
    set.status = 500;
    return { error: err instanceof Error ? err.message : "Rollover failed" };
  }
}

/**
 * Daily auction job. Safe to hit often — the ticker also runs it every minute.
 * GET is here so Railway / Vercel cron can ping a URL without a body.
 *
 * 1. End the expired daily auction and declare the winner
 * 2. Put the winner's project on Today's Attention for 24 hours
 * 3. Start the next 24-hour auction (or the first one, if none exists)
 */
export const cronRoutes = new Elysia({ prefix: "/internal" })
  .get("/cron/daily-auction", runDailyAuctionCron)
  .post("/cron/daily-auction", runDailyAuctionCron);
