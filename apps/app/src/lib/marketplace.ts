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
