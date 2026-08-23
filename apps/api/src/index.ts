import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./routes/auth";
import { socialRoutes } from "./routes/socials";

const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3002";
const PORT = Number(process.env.PORT || 3001);

const app = new Elysia()
  .use(
    cors({
      origin: [APP_ORIGIN, "http://localhost:3002", "http://127.0.0.1:3002"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .get("/health", () => ({ ok: true, service: "house-api" }))
  .use(authRoutes)
  .use(socialRoutes)
  .listen(PORT);

console.log(`House API listening on http://localhost:${PORT}`);

export type App = typeof app;
