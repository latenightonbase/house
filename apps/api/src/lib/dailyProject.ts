import { prisma } from "../db";
import { cacheDel, cacheGet, cacheSet } from "./redis";

/**
 * A bidder's pitch for one day's auction: the project that takes over the
 * billboard for 24 hours if their bid is the highest when the clock runs out.
 *
 * The details are entered once per auction. Getting outbid must never cost a
 * bidder the form again, so every read goes through Redis first and the record
 * survives independently of the bid rows — re-bidding just reuses it.
 */
export interface DailyProjectInput {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
}

export interface SerializedDailyProject extends DailyProjectInput {
  listingId: string;
  bidderWallet: string;
  updatedAt: string;
}

/** Long enough to cover a 24h auction plus its 24h billboard run. */
const TTL_SECONDS = 60 * 60 * 52;

const key = (listingId: string, wallet: string) =>
  `lnoc:daily-project:${listingId}:${wallet.toLowerCase()}`;

type ProjectRow = {
  listingId: string;
  bidderWallet: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  updatedAt: Date;
};

function serialize(row: ProjectRow): SerializedDailyProject {
  return {
    listingId: row.listingId,
    bidderWallet: row.bidderWallet,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    websiteUrl: row.websiteUrl,
    twitterUrl: row.twitterUrl,
    youtubeUrl: row.youtubeUrl,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Trims to null so an empty form field never stores an empty string. */
function clean(value: string | null | undefined, max: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * Reads a bidder's pitch, Redis first. A cache miss falls through to Postgres
 * and re-warms the key, so a cold or absent Redis only costs a query.
 */
export async function getDailyProject(
  listingId: string,
  wallet: string,
): Promise<SerializedDailyProject | null> {
  const cacheKey = key(listingId, wallet);
  const cached = await cacheGet<SerializedDailyProject>(cacheKey);
  if (cached) return cached;

  const row = await prisma.dailyProject.findUnique({
    where: { listingId_bidderWallet: { listingId, bidderWallet: wallet.toLowerCase() } },
  });
  if (!row) return null;

  const project = serialize(row);
  await cacheSet(cacheKey, project, TTL_SECONDS);
  return project;
}

/**
 * Upserts a pitch and refreshes the cache. Called both when a bidder saves
 * details ahead of a bid and when a bid arrives carrying them.
 */
export async function saveDailyProject(
  listingId: string,
  wallet: string,
  userId: string | null,
  input: DailyProjectInput,
): Promise<SerializedDailyProject> {
  const bidderWallet = wallet.toLowerCase();
  const data = {
    name: input.name.trim().slice(0, 80),
    description: clean(input.description, 600),
    imageUrl: clean(input.imageUrl, 600),
    websiteUrl: clean(input.websiteUrl, 300),
    twitterUrl: clean(input.twitterUrl, 300),
    youtubeUrl: clean(input.youtubeUrl, 300),
  };

  const row = await prisma.dailyProject.upsert({
    where: { listingId_bidderWallet: { listingId, bidderWallet } },
    create: { listingId, bidderWallet, submittedByUserId: userId, ...data },
    update: data,
  });

  const project = serialize(row);
  await cacheSet(key(listingId, bidderWallet), project, TTL_SECONDS);
  return project;
}

export async function invalidateDailyProject(listingId: string, wallet: string) {
  await cacheDel(key(listingId, wallet));
}

/**
 * The pitch belonging to a settled auction's winner — what "Today's Attention"
 * puts on the billboard. Read straight from Postgres: it is a public, cacheable
 * page served to everyone, not a per-bidder draft.
 */
export async function getWinningProject(
  listingId: string,
  winnerWallet: string | null,
): Promise<SerializedDailyProject | null> {
  if (!winnerWallet) return null;
  const row = await prisma.dailyProject.findUnique({
    where: {
      listingId_bidderWallet: { listingId, bidderWallet: winnerWallet.toLowerCase() },
    },
  });
  return row ? serialize(row) : null;
}
