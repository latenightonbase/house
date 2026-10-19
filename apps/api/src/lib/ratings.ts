import { prisma } from "../db";
import { getRedis } from "./redis";

/**
 * The one number shown beside a person's name everywhere — their average
 * across every review they have received, as buyer and seller together, which
 * is the same figure their profile header leads with.
 *
 * Always computed from `Review` rows, never from `CreatorProfile.averageRating`:
 * that column predates reviews and the seed script fills it with made-up
 * figures for the demo creators.
 */
export type Rating = { average: number; count: number };

/**
 * Ratings are read on nearly every page — each listing card, bidder, sale and
 * chat thread carries one — but only change when a review is written. So they
 * are cached in two layers and dropped the moment a review lands
 * (`invalidateRatings`):
 *
 * - Redis, shared across API instances, for an hour. Optional: unset locally
 *   and able to drop out, so every read falls through to the database.
 * - A small in-process map for a minute, so a busy page does not even make the
 *   Redis round trip. Another instance's invalidation reaches it only when it
 *   expires, which bounds staleness at a minute.
 *
 * Unrated people are cached too (as `null`), or each of them would cost a
 * database query on every page they appear on.
 */
const REDIS_TTL_SECONDS = 60 * 60;
const MEMORY_TTL_MS = 60_000;
const MEMORY_MAX_ENTRIES = 5_000;
/** A slow Redis must not hold a page up longer than the query it saves. */
const REDIS_TIMEOUT_MS = 150;

const redisKey = (userId: string) => `rating:v1:${userId}`;

const memory = new Map<string, { rating: Rating | null; expires: number }>();

function remember(userId: string, rating: Rating | null) {
  // Map keeps insertion order, so the first key is the oldest — evict it.
  if (memory.size >= MEMORY_MAX_ENTRIES) memory.delete(memory.keys().next().value!);
  memory.set(userId, { rating, expires: Date.now() + MEMORY_TTL_MS });
}

function withTimeout<T>(promise: Promise<T>): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), REDIS_TIMEOUT_MS)),
  ]).catch(() => null);
}

async function readRedis(ids: string[]): Promise<Map<string, Rating | null>> {
  const found = new Map<string, Rating | null>();
  const redis = getRedis();
  if (!redis || ids.length === 0) return found;

  const values = await withTimeout(redis.mget(ids.map(redisKey)));
  values?.forEach((value, index) => {
    if (value == null) return;
    try {
      found.set(ids[index], JSON.parse(value) as Rating | null);
    } catch {
      // A corrupt entry is just a miss.
    }
  });
  return found;
}

function writeRedis(entries: Array<[string, Rating | null]>) {
  const redis = getRedis();
  if (!redis || entries.length === 0) return;
  const pipeline = redis.pipeline();
  for (const [userId, rating] of entries) {
    pipeline.set(redisKey(userId), JSON.stringify(rating), "EX", REDIS_TTL_SECONDS);
  }
  // Fire and forget: the page already has its answer from the database.
  pipeline.exec().catch(() => {});
}

async function queryRatings(ids: string[]): Promise<Map<string, Rating>> {
  if (ids.length === 0) return new Map();
  const groups = await prisma.review.groupBy({
    by: ["revieweeId"],
    where: { revieweeId: { in: ids } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    groups.map((group) => [
      group.revieweeId,
      { average: Math.round((group._avg.rating ?? 0) * 10) / 10, count: group._count._all },
    ]),
  );
}

/** Ratings for a whole page of people — memory, then Redis, then one query. */
export async function ratingsByUser(userIds: Iterable<string>): Promise<Map<string, Rating>> {
  const ids = [...new Set(userIds)].filter(Boolean);
  const result = new Map<string, Rating>();
  if (ids.length === 0) return result;

  const now = Date.now();
  let missing: string[] = [];
  for (const id of ids) {
    const cached = memory.get(id);
    if (cached && cached.expires > now) {
      if (cached.rating) result.set(id, cached.rating);
    } else {
      missing.push(id);
    }
  }

  if (missing.length > 0) {
    const fromRedis = await readRedis(missing);
    for (const [id, rating] of fromRedis) {
      remember(id, rating);
      if (rating) result.set(id, rating);
    }
    missing = missing.filter((id) => !fromRedis.has(id));
  }

  if (missing.length > 0) {
    const fromDb = await queryRatings(missing);
    const entries = missing.map((id) => [id, fromDb.get(id) ?? null] as [string, Rating | null]);
    for (const [id, rating] of entries) {
      remember(id, rating);
      if (rating) result.set(id, rating);
    }
    writeRedis(entries);
  }

  return result;
}

/** Drops cached ratings — call whenever a review of these people is written. */
export async function invalidateRatings(userIds: string[]) {
  for (const id of userIds) memory.delete(id);
  const redis = getRedis();
  if (!redis || userIds.length === 0) return;
  await withTimeout(redis.del(...userIds.map(redisKey)));
}

/** Sets `rating` on each party that has an account, in place, in one lookup. */
export async function fillRatings<T extends { userId: string | null; rating: Rating | null }>(
  parties: T[],
): Promise<T[]> {
  const ratings = await ratingsByUser(
    parties.map((p) => p.userId).filter((id): id is string => Boolean(id)),
  );
  for (const party of parties) {
    party.rating = party.userId ? (ratings.get(party.userId) ?? null) : null;
  }
  return parties;
}
