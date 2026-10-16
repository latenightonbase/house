import Redis from "ioredis";

/**
 * Railway Redis, optional. Every caller must keep working when this returns
 * null — the URL is unset locally, and a managed Redis can drop out at any
 * time. Nothing here is a source of truth.
 */
const REDIS_URL =
  process.env.REDIS_URL || process.env.REDIS_CACHE_URL || process.env.REDIS_PUBLIC_URL || "";

let client: Redis | null = null;
let unavailable = false;

export function getRedis(): Redis | null {
  if (unavailable || !REDIS_URL) return null;
  if (client) return client;

  try {
    client = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      // Railway's proxy occasionally resets idle connections; one quick retry
      // then give up rather than queueing commands.
      retryStrategy: (attempt) => (attempt > 2 ? null : 200 * attempt),
    });
    client.on("error", (err) => {
      if (!unavailable) console.warn("[redis] unavailable:", err.message);
      unavailable = true;
    });
    client.on("ready", () => {
      unavailable = false;
    });
  } catch (err) {
    console.warn("[redis] client init failed:", err);
    unavailable = true;
    return null;
  }
  return client;
}
