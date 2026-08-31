import { Elysia } from "elysia";
import { settleAndRolloverDailyAuction } from "../lib/dailyAuction";

export const cronRoutes = new Elysia({ prefix: "/internal" }).post(
  "/cron/daily-auction",
  async ({ request, set }) => {
    const expected = process.env.CRON_SECRET?.trim();
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-cron-secret");
    if (!expected || token !== expected) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    try {
      const result = await settleAndRolloverDailyAuction();
      return { ok: true, result };
    } catch (err) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : "Rollover failed" };
    }
  },
);
