import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./routes/auth";
import { socialRoutes } from "./routes/socials";
import { marketplaceRoutes } from "./routes/marketplace";
import { cronRoutes } from "./routes/cron";
import { uploadRoutes } from "./routes/uploads";
import { chatRoutes } from "./routes/chat";
import { profileRoutes } from "./routes/profile";
import { callRoutes } from "./routes/calls";
import { startDailyAuctionTicker } from "./lib/dailyAuction";
import { websocket } from "elysia/ws";
import { getAllowedOrigins } from "./lib/origins";

const PORT = Number(process.env.PORT || 3001);

/** Vercel used to forward `/backend/*` to this host without stripping the prefix. */
function stripBackendPrefix(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname !== "/backend" && !url.pathname.startsWith("/backend/")) {
    return request;
  }
  url.pathname = url.pathname.slice("/backend".length) || "/";
  return new Request(url, request);
}

const app = new Elysia()
  .use(
    cors({
      origin: getAllowedOrigins(),
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-cron-secret"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .get("/health", () => ({ ok: true, service: "house-api" }))
  .use(authRoutes)
  .use(socialRoutes)
  .use(marketplaceRoutes)
  .use(cronRoutes)
  .use(uploadRoutes)
  .use(profileRoutes)
  .use(chatRoutes)
  .use(callRoutes);

/**
 * `websocket` and the `app.server` assignment are both required for `.ws()` to
 * work. This server is started by hand rather than with `app.listen()`, and
 * Elysia's ws route upgrades through `app.server.upgrade(...)` — without the
 * handler here and the back-reference below, every upgrade fails.
 */
const server = Bun.serve({
  port: PORT,
  fetch: (request) => app.fetch(stripBackendPrefix(request)),
  websocket,
});

app.server = server;

// Local runs share the hosted DB and operator key, so a dev API must not open
// or settle real auctions: `DISABLE_TICKERS=1` serves requests without the ticker.
if (process.env.DISABLE_TICKERS === "1") {
  console.log("DISABLE_TICKERS=1 — daily auction / settlement ticker not started");
} else {
  startDailyAuctionTicker();
}

console.log(`House API listening on http://localhost:${PORT}`);


export type App = typeof app;
