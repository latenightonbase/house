import type { Listing } from "@/lib/marketplace";

/**
 * The pitch a bidder attaches to a daily-auction bid — the project that takes
 * the billboard for 24 hours if they win. Only `name` is required.
 */
export interface DailyProject {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
}

export interface SavedDailyProject extends DailyProject {
  listingId: string;
  bidderWallet: string;
  updatedAt: string;
}

/** Live bid state for the auction panel. */
export interface AuctionState {
  currentBid: number;
  reservePrice: number;
  bidCount: number;
  bidderCount: number;
  leader: {
    wallet: string;
    name: string;
    avatarUrl?: string | null;
    amount: number;
  } | null;
}

/** What is on the billboard right now — the last auction's winning pitch. */
export interface Spotlight extends DailyProject {
  listingId: string;
  winnerWallet: string | null;
  winningBid: number;
  liveSince: string | null;
  liveUntil: string | null;
}

export interface PastWinner extends DailyProject {
  listingId: string;
  winnerWallet: string | null;
  winningBid: number;
  settledAt: string | null;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchDailyAuction(): Promise<{
  listing: Listing | null;
  auction: AuctionState | null;
}> {
  return getJson("/backend/listings/daily");
}

export async function fetchSpotlight(): Promise<Spotlight | null> {
  const data = await getJson<{ spotlight: Spotlight | null }>(
    "/backend/listings/daily/spotlight",
  );
  return data.spotlight;
}

export async function fetchPastWinners(limit = 24): Promise<PastWinner[]> {
  const data = await getJson<{ winners: PastWinner[] }>(
    `/backend/listings/daily/winners?limit=${limit}`,
  );
  return data.winners;
}

/**
 * The signed-in bidder's saved pitch for this auction, if any. A 401 means not
 * signed in, which is not an error here — the dialog just starts empty.
 */
export async function fetchMyProject(listingId: string): Promise<SavedDailyProject | null> {
  const res = await fetch(`/backend/listings/${listingId}/project`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { project: SavedDailyProject | null };
  return data.project;
}

/** Saves the pitch before the bid transaction, so a failed tx never loses it. */
export async function saveMyProject(
  listingId: string,
  project: DailyProject,
): Promise<SavedDailyProject> {
  const res = await fetch(`/backend/listings/${listingId}/project`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Could not save details");
  return (data as { project: SavedDailyProject }).project;
}

/** Records a confirmed on-chain bid, carrying the pitch when one is supplied. */
export async function recordDailyBid(
  listingId: string,
  amount: number,
  txHash: string,
  project?: DailyProject,
): Promise<{ listing: Listing; auction: AuctionState }> {
  const res = await fetch(`/backend/listings/${listingId}/bid`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, txHash, ...(project ? { project } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Could not record bid");
  return data as { listing: Listing; auction: AuctionState };
}

export interface Leader {
  wallet: string;
  name: string;
  imageUrl?: string | null;
  totalBid: number;
  highestBid: number;
  bidCount: number;
  wins: number;
}

export async function fetchLeaderboard(limit = 25): Promise<Leader[]> {
  const data = await getJson<{ leaders: Leader[] }>(
    `/backend/listings/daily/leaderboard?limit=${limit}`,
  );
  return data.leaders;
}
