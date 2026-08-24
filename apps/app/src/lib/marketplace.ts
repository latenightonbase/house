import type { Platform } from "@/components/ui/PlatformIcons";

export type { Platform };

export interface Host {
  id: string;
  wallet: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  verified: boolean;
  averageRating?: number;
  totalReviews?: number;
}

export interface TopBidder {
  wallet: string;
  name: string;
  avatarUrl?: string;
  amount: number;
}

export interface Auction {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  currency: string;
  minimumBid: number;
  hostedBy: Host;
  highestBid: number;
  imageUrl?: string;
  topBidder: TopBidder | null;
  participantCount: number;
  hoursRemaining: number;
  bidCount: number;
  createdBy: "human" | "bot";
  featured: boolean;
  reach: { platform: Platform; value: string }[];
  tags: string[];
  avgViews?: string;
  engagement?: string;
  trend: number[];
}

export interface Earner {
  id: string;
  wallet: string;
  totalRevenue: number;
  auctionCount: number;
  bookingsThisMonth: number;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  verified: boolean;
  reach?: string;
  engagement?: string;
  inventory: number;
  fromPrice?: number;
  platforms: Platform[];
  tags: string[];
  trend: number[];
}

export interface PlatformAnalytics {
  totalAuctions: number;
  auctionsWithBids: number;
  totalEarnings: number;
  uniqueBidders: number;
}

export interface Booking {
  id: string;
  brand: string;
  markUrl?: string;
  amount: number;
  placement: string;
  creator: string;
  status: "CONFIRMED" | "PENDING";
}

export interface Campaign {
  id: string;
  name: string;
  budget: number;
  lookingFor: string;
  markUrl?: string;
  brandName?: string;
  brief?: string;
  platforms: Platform[];
  minReach?: number;
  status: "OPEN" | "IN_REVIEW" | "CLOSED";
  deadline?: string;
  applicantCount: number;
}

/** The market's headline figures, denominated in attention rather than tokens. */
export interface MarketStats {
  mediaVolume: number;
  creators: number;
  listings: number;
  activeCampaigns: number;
}

export interface ListingCreator {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  verified: boolean;
  reach: string;
}

/** Fixed-price media inventory — bought outright, no bidding. */
export interface Listing {
  id: string;
  title: string;
  description?: string;
  placement: string;
  platform: Platform;
  price: number;
  currency: string;
  turnaroundDays?: number;
  slotsAvailable: number;
  creator: ListingCreator;
}

export interface Vault {
  id: string;
  name: string;
  totalRewards: number;
  distributed: number;
  currency: string;
}

export interface Activation {
  id: string;
  name: string;
  description?: string;
  brandName: string;
  brandMarkUrl?: string;
  status: "LIVE" | "UPCOMING" | "ENDED";
  participantCount: number;
  startDate: string;
  endDate?: string;
  vault: Vault | null;
}

export interface CreatorToken {
  id: string;
  symbol: string;
  name: string;
  holders: number;
  supply: number;
  revenueSharePct?: number;
  creator: ListingCreator;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchAnalytics(): Promise<PlatformAnalytics> {
  return getJson("/backend/analytics");
}

export async function fetchAuctions(
  params: { status?: "live"; limit?: number } = {},
): Promise<Auction[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.limit) qs.set("limit", String(params.limit));
  const data = await getJson<{ auctions: Auction[] }>(`/backend/auctions?${qs.toString()}`);
  return data.auctions;
}

export async function fetchCreators(limit = 20): Promise<Earner[]> {
  const data = await getJson<{ creators: Earner[] }>(`/backend/creators?limit=${limit}`);
  return data.creators;
}

export async function fetchBookings(limit = 5): Promise<Booking[]> {
  const data = await getJson<{ bookings: Booking[] }>(`/backend/bookings?limit=${limit}`);
  return data.bookings;
}

export async function fetchLatestCampaign(): Promise<Campaign | null> {
  const data = await getJson<{ campaign: Campaign | null }>("/backend/campaigns/latest");
  return data.campaign;
}

export async function fetchMarketStats(): Promise<MarketStats> {
  return getJson("/backend/market-stats");
}

export async function fetchListings(
  params: { platform?: string; limit?: number } = {},
): Promise<Listing[]> {
  const qs = new URLSearchParams();
  if (params.platform) qs.set("platform", params.platform);
  if (params.limit) qs.set("limit", String(params.limit));
  const data = await getJson<{ listings: Listing[] }>(`/backend/listings?${qs.toString()}`);
  return data.listings;
}

export async function fetchCampaigns(limit = 30): Promise<Campaign[]> {
  const data = await getJson<{ campaigns: Campaign[] }>(`/backend/campaigns?limit=${limit}`);
  return data.campaigns;
}

export async function fetchActivations(limit = 30): Promise<Activation[]> {
  const data = await getJson<{ activations: Activation[] }>(
    `/backend/activations?limit=${limit}`,
  );
  return data.activations;
}

export async function fetchCreatorTokens(limit = 30): Promise<CreatorToken[]> {
  const data = await getJson<{ tokens: CreatorToken[] }>(
    `/backend/creator-tokens?limit=${limit}`,
  );
  return data.tokens;
}

export async function fetchCreator(id: string): Promise<{
  creator: Earner;
  listings: Listing[];
  token: CreatorToken | null;
}> {
  return getJson(`/backend/creators/${id}`);
}

/** Compact money for the market strip: $25.8K, $2.4M. */
export function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}
