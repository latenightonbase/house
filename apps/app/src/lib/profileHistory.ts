/**
 * Profile history — what someone sold and who won it, and what they bought or
 * won from other people.
 *
 * The public and private endpoints return the same records with one deliberate
 * difference: only the private one carries a counterparty `userId`. That id is
 * what the contact button needs, so the type marks it optional and the UI shows
 * the button only where it is present. A visitor therefore cannot open a chat
 * with a stranger from someone else's profile page.
 */

import type { Rating } from "@/lib/ratings";

export type PricingType = "FIXED" | "AUCTION";

export type PartyIdentity = {
  /** Present on the private view only. Absent means "not contactable here". */
  userId?: string | null;
  wallet: string | null;
  name: string;
  username: string | null;
  /** Opens their public profile; null for a wallet that never signed in. */
  handle?: string | null;
  avatarUrl: string | null;
  /** Their overall review rating, or null if nobody has reviewed them yet. */
  rating?: Rating | null;
};

/** The review the signed-in user left for a deal — private view only. */
export type OwnReview = { rating: number; comment: string | null };

export type SaleCounterparty = PartyIdentity & {
  /** Names this sale when reviewing it. */
  dealKey: string;
  /** Present on the private view: null until the user rates this buyer. */
  myReview?: OwnReview | null;
  amount: number;
  currency: string;
  txHash: string | null;
  at: string;
};

export type SaleRecord = {
  listingId: string;
  title: string;
  posterUrl: string | null;
  category: string;
  pricingType: PricingType;
  status: string;
  price: number;
  currency: string;
  endDate: string | null;
  settledAt: string | null;
  createdAt: string;
  totalEarned: number;
  counterparties: SaleCounterparty[];
};

export type PurchaseRecord = {
  listingId: string;
  title: string;
  posterUrl: string | null;
  category: string;
  pricingType: PricingType;
  via: "PURCHASE" | "AUCTION_WIN";
  /** Names this sale when reviewing it. */
  dealKey: string;
  /** Present on the private view: null until the user rates this seller. */
  myReview?: OwnReview | null;
  amount: number;
  currency: string;
  txHash: string | null;
  at: string;
  seller: PartyIdentity;
};

export type ProfileHeader = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  wallet: string | null;
  createdAt: string;
  verified: boolean;
  reach: number;
  rating: ReviewSummary;
  socials: Array<{
    platform: string;
    username: string | null;
    displayName: string | null;
    followerCount: number | null;
  }>;
};

export type RatingSummary = { average: number | null; count: number };

/** Ratings split by the side of the deal the person was on. */
export type ReviewSummary = {
  asSeller: RatingSummary;
  asBuyer: RatingSummary;
  /** Both roles together, from the raw ratings — matches the badge beside their name. */
  overall?: RatingSummary;
};

export type ReviewRole = "SELLER" | "BUYER";

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  /** The side of the deal the profile's owner was on. */
  revieweeRole: ReviewRole;
  listingId: string | null;
  listingTitle: string;
  createdAt: string;
  reviewer: PartyIdentity;
};

export type ProfileOverview = {
  profile: ProfileHeader | null;
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
  reviews: PublicReview[];
};

export const MAX_REVIEW_COMMENT = 500;

/** Rates the other side of a deal, or edits the rating already given. */
export async function submitReview(input: {
  dealKey: string;
  rating: number;
  comment?: string | null;
}): Promise<OwnReview> {
  const data = await getJson<{ review: OwnReview }>("/backend/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return data.review;
}

/** Both roles together — what a profile is summed up by at a glance. */
export function overallRating(summary: ReviewSummary): RatingSummary {
  if (summary.overall) return summary.overall;
  const count = summary.asSeller.count + summary.asBuyer.count;
  if (count === 0) return { average: null, count: 0 };
  const total =
    (summary.asSeller.average ?? 0) * summary.asSeller.count +
    (summary.asBuyer.average ?? 0) * summary.asBuyer.count;
  return { average: Math.round((total / count) * 10) / 10, count };
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", cache: "no-store", ...init });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/** The signed-in user's own history. Counterparties here are contactable. */
export function fetchMyProfileOverview(): Promise<ProfileOverview> {
  return getJson<ProfileOverview>("/backend/profile/overview");
}

/** Anyone's public history, by user id or username. Not contactable. */
export async function fetchUserProfile(handle: string): Promise<ProfileOverview | null> {
  const res = await fetch(`/backend/users/${encodeURIComponent(handle)}/profile`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load profile");
  return (await res.json()) as ProfileOverview;
}

/** Dollar-pegged tokens read as dollars; anything else (LNOC) keeps its symbol. */
const DOLLAR_PEGGED = new Set(["USD", "USDC", "USDG", "USDT"]);

export function formatAmount(amount: number, currency = "USDC") {
  const formatted = amount.toLocaleString(undefined, {
    maximumFractionDigits: amount >= 1000 ? 0 : amount < 1 ? 4 : 2,
  });
  return DOLLAR_PEGGED.has(currency.toUpperCase())
    ? `$${formatted}`
    : `${formatted} ${currency}`;
}

/**
 * Sums amounts per currency — dollar stables together, each other token on its
 * own — and joins them: "$1,520 · 4.2M LNOC". Zero records read as "$0".
 */
export function formatTotals(entries: Array<[amount: number, currency: string]>) {
  const totals = new Map<string, number>();
  for (const [amount, currency] of entries) {
    const key = DOLLAR_PEGGED.has(currency.toUpperCase()) ? "USD" : currency.toUpperCase();
    totals.set(key, (totals.get(key) ?? 0) + amount);
  }
  if (totals.size === 0) return formatAmount(0, "USD");
  return [...totals.entries()].map(([currency, sum]) => formatAmount(sum, currency)).join(" · ");
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** How a sale reads in a list: "Auction" vs "Direct sale". */
export function saleKindLabel(sale: SaleRecord) {
  return sale.pricingType === "AUCTION" ? "Auction" : "Direct sale";
}

/** One of the signed-in user's deals on a listing — see `useListingDeals`. */
export type ListingDeal = {
  dealKey: string;
  /** The viewer's side of the deal. */
  side: "BUYER" | "SELLER";
  /** The other party, with the `userId` the contact button needs. */
  counterparty: PartyIdentity;
  amount: number;
  currency: string;
  at: string;
  myReview: OwnReview | null;
};

/** The signed-in user's own deals on one listing: what they bought, or who bought it. */
export async function fetchListingDeals(listingId: string): Promise<ListingDeal[]> {
  const data = await getJson<{ deals: ListingDeal[] }>(
    `/backend/profile/deals/${encodeURIComponent(listingId)}`,
  );
  return data.deals;
}
