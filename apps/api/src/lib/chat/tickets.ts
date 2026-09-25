import { randomBytes } from "crypto";
import { getRedis } from "../redis";

/**
 * Short-lived, single-use tickets that authenticate a WebSocket upgrade.
 *
 * The session cookie cannot do this job. The browser reaches the API through
 * the app's own `/backend/*` proxy, which makes `house_session` a host-only
 * cookie on the app domain — and a WebSocket cannot be proxied through a Next
 * route handler anyway. So the socket connects straight to the API origin,
 * where that cookie is never sent. Instead the client asks for a ticket over
 * the authenticated HTTP path and spends it on the upgrade.
 *
 * Redis holds them when it is configured so any instance can redeem a ticket
 * minted by another; without it the in-memory map is correct for a single
 * instance, which matches how the rest of this codebase treats Redis.
 */

const TTL_SECONDS = 60;
const key = (ticket: string) => `lnoc:chat-ticket:${ticket}`;

type Pending = { userId: string; expiresAt: number };

const memory = new Map<string, Pending>();

function sweepMemory(now: number) {
  for (const [ticket, pending] of memory) {
    if (pending.expiresAt <= now) memory.delete(ticket);
  }
}

export async function issueChatTicket(userId: string): Promise<{
  ticket: string;
  expiresIn: number;
}> {
  const ticket = randomBytes(32).toString("hex");
  const redis = getRedis();

  if (redis) {
    try {
      await redis.set(key(ticket), userId, "EX", TTL_SECONDS);
      return { ticket, expiresIn: TTL_SECONDS };
    } catch {
      /* fall through to memory */
    }
  }

  sweepMemory(Date.now());
  memory.set(ticket, { userId, expiresAt: Date.now() + TTL_SECONDS * 1000 });
  return { ticket, expiresIn: TTL_SECONDS };
}

/** Redeems a ticket, consuming it so a leaked URL cannot be replayed. */
export async function redeemChatTicket(ticket: string | undefined): Promise<string | null> {
  if (!ticket) return null;

  const redis = getRedis();
  if (redis) {
    try {
      const userId = await redis.get(key(ticket));
      if (userId) {
        await redis.del(key(ticket));
        return userId;
      }
    } catch {
      /* fall through to memory */
    }
  }

  const pending = memory.get(ticket);
  if (!pending) return null;
  memory.delete(ticket);
  if (pending.expiresAt <= Date.now()) return null;
  return pending.userId;
}
