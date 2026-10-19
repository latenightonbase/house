import { prisma } from "../db";

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

/** One grouped query for a whole page of people. Unrated people are absent. */
export async function ratingsByUser(userIds: Iterable<string>): Promise<Map<string, Rating>> {
  const ids = [...new Set(userIds)].filter(Boolean);
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

/** Same, for people only known by wallet — bidders, mostly. Keyed lower-cased. */
export async function ratingsByWallet(wallets: Iterable<string>): Promise<Map<string, Rating>> {
  const addresses = [...new Set([...wallets].map((w) => w.toLowerCase()))].filter(Boolean);
  if (addresses.length === 0) return new Map();

  const owners = await prisma.wallet.findMany({
    where: { address: { in: addresses } },
    select: { address: true, userId: true },
  });
  const byUser = await ratingsByUser(owners.map((o) => o.userId));

  const map = new Map<string, Rating>();
  for (const owner of owners) {
    const rating = byUser.get(owner.userId);
    if (rating) map.set(owner.address.toLowerCase(), rating);
  }
  return map;
}

/** Sets `rating` on each party that has an account, in place, in one query. */
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
