/**
 * DOMAIN TYPES
 * ============
 * The shapes the UI renders. Presentational components import from here —
 * never from the demo fixtures — so swapping fake data for live API data is
 * a change of data source only, with no component edits.
 *
 * Each type documents the endpoint it mirrors.
 */

/** Auction host / creator. */
export interface Host {
  _id: string;
  wallet: string;
  username?: string;
  display_name?: string;
  socialId?: string;
  pfp_url?: string;
  verified?: boolean;
  averageRating?: number;
  totalReviews?: number;
}

export interface TopBidder {
  wallet: string;
  username: string;
  socialId: string;
  pfp_url?: string | null;
  bidAmount: number;
  _id: string;
}

/** Mirrors `/api/auctions/getTopFive`. */
export interface Auction {
  _id: string;
  auctionName: string;
  description?: string;
  endDate: string;
  startDate: string;
  currency: string;
  minimumBid: number;
  tokenAddress: string;
  blockchainAuctionId: string;
  hostedBy: Host;
  highestBid: number;
  imageUrl?: string;
  /** Square brand mark used in compact rows; falls back to `imageUrl`. */
  markUrl?: string;
  topBidder: TopBidder | null;
  participantCount: number;
  hoursRemaining: number;
  bidCount: number;
  createdByType?: "human" | "bot";
  /** Per-platform reach, shown by the featured panel with each platform's logo. */
  reach?: { platform: Platform; value: string }[];
  tags?: string[];
  /** Headline figures for the featured panel's stat strip. */
  avgViews?: string;
  engagement?: string;
  /** Series driving the featured area chart. */
  trend?: number[];
}

/** Mirrors `/api/leaderboard/recent-bids`. */
export interface RecentBid {
  _id: string;
  bidderName: string;
  bidderPfp?: string;
  bidderWallet: string;
  socialId: string;
  auctionName: string;
  blockchainAuctionId: string;
  bidAmount: number;
  usdcValue: number;
  currency: string;
  bidTimestamp: string;
  source?: "human" | "bot" | null;
}

export type Platform =
  | "x"
  | "youtube"
  | "tiktok"
  | "podcast"
  | "newsletter";

/**
 * Mirrors `/api/leaderboard/top-revenue`, plus the presentation fields the
 * trending table shows. Fields beyond revenue/count are optional because the
 * live endpoint does not return them yet.
 */
export interface Earner {
  _id: string;
  totalRevenue: number;
  auctionCount: number;
  wallet: string;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  socialId?: string;
  verified?: boolean;
  reach?: string;
  engagement?: string;
  inventory?: number;
  fromPrice?: number;
  platforms?: Platform[];
  tags?: string[];
  trend?: number[];
}

/** Mirrors `/api/analytics`. */
export interface PlatformAnalytics {
  totalAuctions: number;
  auctionsWithBids: number;
  totalEarnings: number;
  uniqueBidders: number;
}

/** A settled booking, shown in the Recently Booked strip. */
export interface Booking {
  _id: string;
  brand: string;
  markUrl?: string;
  amount: number;
  placement: string;
  creator: string;
  status: "CONFIRMED" | "PENDING";
}

/** An inbound brand campaign seeking creators. */
export interface Campaign {
  _id: string;
  name: string;
  budget: number;
  lookingFor: string;
}

/** The signed-in viewer, as rendered by the sidebar account block. */
export interface Viewer {
  _id: string;
  wallet: string;
  username: string;
  display_name: string;
  socialId: string;
  pfp_url?: string;
  role?: string;
  level?: number;
  currentSeasonXP?: number;
  totalXP?: number;
  xpToNextLevel?: number;
}
