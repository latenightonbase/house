import Redis from "ioredis";
import { getRedis } from "../redis";

/**
 * Delivery for live chat events.
 *
 * Sockets are held in-process, keyed by user id — one person can have several
 * (two tabs, phone and laptop). Delivering to a user means writing to every
 * socket they have open on this instance.
 *
 * That alone is only correct while the API runs as one process. When REDIS_URL
 * is set, every event is also published on a channel that all instances
 * subscribe to, so a message sent on instance A reaches a recipient connected
 * to instance B. Redis staying optional matches the rest of the codebase: it is
 * a delivery path, never the source of truth, and the message is already
 * committed to Postgres before anything is published.
 */

const CHANNEL = "lnoc:chat:events";

export type ChatEvent =
  | { type: "message"; conversationId: string; message: unknown }
  | { type: "read"; conversationId: string; userId: string; lastReadAt: string }
  | { type: "typing"; conversationId: string; userId: string }
  | { type: "conversation"; conversation: unknown };

/** The subset of a socket the hub needs — keeps Elysia's ws type out of here. */
type Socket = { send: (data: string) => unknown };

type Envelope = {
  /** Which users should receive this event. */
  to: string[];
  event: ChatEvent;
  /** Set by the publisher so an instance does not re-deliver its own echo. */
  origin: string;
};

const INSTANCE_ID = crypto.randomUUID();

const sockets = new Map<string, Set<Socket>>();

let subscriber: Redis | null = null;
let subscribing = false;

export function connectionCount(userId: string): number {
  return sockets.get(userId)?.size ?? 0;
}

export function isOnline(userId: string): boolean {
  return connectionCount(userId) > 0;
}

export function addSocket(userId: string, socket: Socket) {
  let set = sockets.get(userId);
  if (!set) {
    set = new Set();
    sockets.set(userId, set);
  }
  set.add(socket);
  void ensureSubscribed();
}

export function removeSocket(userId: string, socket: Socket) {
  const set = sockets.get(userId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) sockets.delete(userId);
}

/** Writes to this instance's sockets only. */
function deliverLocally(userIds: string[], event: ChatEvent) {
  const payload = JSON.stringify(event);
  for (const userId of new Set(userIds)) {
    const set = sockets.get(userId);
    if (!set) continue;
    for (const socket of set) {
      try {
        socket.send(payload);
      } catch (err) {
        console.warn("[chat-hub] send failed:", err);
      }
    }
  }
}

/**
 * Subscribes once, lazily, on the first connection. ioredis needs a dedicated
 * connection for subscribe mode, so this cannot reuse the shared cache client.
 */
async function ensureSubscribed() {
  if (subscriber || subscribing) return;
  const url =
    process.env.REDIS_URL || process.env.REDIS_CACHE_URL || process.env.REDIS_PUBLIC_URL || "";
  if (!url) return;

  subscribing = true;
  try {
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (attempt) => Math.min(attempt * 500, 5_000),
    });
    client.on("error", (err) => console.warn("[chat-hub] subscriber error:", err.message));
    client.on("message", (_channel, raw) => {
      try {
        const envelope = JSON.parse(raw) as Envelope;
        if (envelope.origin === INSTANCE_ID) return;
        deliverLocally(envelope.to, envelope.event);
      } catch {
        /* ignore malformed payloads */
      }
    });

    await client.connect();
    await client.subscribe(CHANNEL);
    subscriber = client;
    console.log("[chat-hub] subscribed to", CHANNEL);
  } catch (err) {
    console.warn("[chat-hub] subscribe failed, staying single-instance:", err);
  } finally {
    subscribing = false;
  }
}

/**
 * Sends an event to a set of users wherever they are connected. Local sockets
 * get it synchronously; the Redis publish is best-effort and never blocks or
 * fails the caller, because the message is already persisted by this point.
 */
export function publish(userIds: string[], event: ChatEvent) {
  deliverLocally(userIds, event);

  const redis = getRedis();
  if (!redis) return;

  const envelope: Envelope = { to: [...new Set(userIds)], event, origin: INSTANCE_ID };
  void redis.publish(CHANNEL, JSON.stringify(envelope)).catch(() => {
    /* best-effort cross-instance fan-out */
  });
}
