import type { ReviewRole } from "@prisma/client";
import { prisma } from "../db";
import { toIdentity, type PartyIdentity } from "./profileHistory";
import { fillRatings, invalidateRatings } from "./ratings";

/**
 * Reviews between the two sides of a completed deal. Only the people who
 * traded can rate each other — the buyer rates the seller, the seller rates
 * the buyer, once each per deal — so a profile's rating is built from real
 * sales and cannot be padded by strangers.
 *
 * A deal is named by a `dealKey`: `purchase:<purchaseId>` for a fixed-price
 * sale (one listing can sell several times, each its own deal) or
 * `auction:<listingId>` for a settled auction, which only ever has one winner.
 */

export const MAX_REVIEW_COMMENT = 500;

export function purchaseDealKey(purchaseId: string) {
  return `purchase:${purchaseId}`;
}

export function auctionDealKey(listingId: string) {
  return `auction:${listingId}`;
}

type Deal = {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  /** Null when an auction was won by a wallet that has never signed in. */
  buyerId: string | null;
};

async function resolveDeal(dealKey: string): Promise<Deal | null> {
  const [kind, id] = dealKey.split(":");
  if (!id) return null;

  if (kind === "purchase") {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { listing: { include: { creator: { select: { userId: true } } } } },
    });
    if (!purchase) return null;
    return {
      listingId: purchase.listingId,
      listingTitle: purchase.listing.title,
      sellerId: purchase.listing.creator.userId,
      buyerId: purchase.buyerUserId,
    };
  }

  if (kind === "auction") {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { creator: { select: { userId: true } } },
    });
    // Only a settled auction with a winner is a deal; one that closed without
    // bids, or has not been settled yet, has nobody on the other side.
    if (!listing || listing.pricingType !== "AUCTION" || !listing.settledAt || !listing.winnerWallet) {
      return null;
    }
    const wallet = await prisma.wallet.findUnique({
      where: { address: listing.winnerWallet.toLowerCase() },
      select: { userId: true },
    });
    return {
      listingId: listing.id,
      listingTitle: listing.title,
      sellerId: listing.creator.userId,
      buyerId: wallet?.userId ?? null,
    };
  }

  return null;
}

export type ReviewResult =
  | { ok: true; review: { rating: number; comment: string | null; revieweeRole: ReviewRole } }
  | { ok: false; status: number; error: string };

/**
 * Leaves or edits the session user's review of the other side of a deal. A
 * second submission for the same deal replaces the first, so a typo or a
 * change of heart is an edit rather than a second vote.
 */
export async function submitReview(
  reviewerId: string,
  input: { dealKey: string; rating: number; comment?: string | null },
): Promise<ReviewResult> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, status: 400, error: "Rating must be a whole number from 1 to 5" };
  }
  const comment = input.comment?.trim() || null;
  if (comment && comment.length > MAX_REVIEW_COMMENT) {
    return {
      ok: false,
      status: 400,
      error: `Keep the review under ${MAX_REVIEW_COMMENT} characters`,
    };
  }

  const deal = await resolveDeal(input.dealKey);
  if (!deal) return { ok: false, status: 404, error: "That sale could not be found" };

  let revieweeId: string;
  let revieweeRole: ReviewRole;
  if (reviewerId === deal.buyerId && reviewerId !== deal.sellerId) {
    revieweeId = deal.sellerId;
    revieweeRole = "SELLER";
  } else if (reviewerId === deal.sellerId && deal.buyerId && deal.buyerId !== deal.sellerId) {
    revieweeId = deal.buyerId;
    revieweeRole = "BUYER";
  } else {
    return { ok: false, status: 403, error: "Only the buyer and seller of a sale can review it" };
  }

  const review = await prisma.review.upsert({
    where: { dealKey_reviewerId: { dealKey: input.dealKey, reviewerId } },
    create: {
      dealKey: input.dealKey,
      rating: input.rating,
      comment,
      revieweeRole,
      listingId: deal.listingId,
      listingTitle: deal.listingTitle,
      reviewerId,
      revieweeId,
    },
    update: { rating: input.rating, comment },
  });
  // The badge beside their name everywhere reads from the rating cache.
  await invalidateRatings([revieweeId]);

  return {
    ok: true,
    review: { rating: review.rating, comment: review.comment, revieweeRole },
  };
}

export type RatingSummary = { average: number | null; count: number };

export type ReviewSummary = {
  asSeller: RatingSummary;
  asBuyer: RatingSummary;
  /** Both roles together, from the raw ratings — what the badge beside their name shows. */
  overall: RatingSummary;
};

export async function getReviewSummary(userId: string): Promise<ReviewSummary> {
  const groups = await prisma.review.groupBy({
    by: ["revieweeRole"],
    where: { revieweeId: userId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const pick = (role: ReviewRole): RatingSummary => {
    const group = groups.find((g) => g.revieweeRole === role);
    return {
      average: group?._avg.rating == null ? null : Math.round(group._avg.rating * 10) / 10,
      count: group?._count._all ?? 0,
    };
  };
  const count = groups.reduce((sum, g) => sum + g._count._all, 0);
  const total = groups.reduce((sum, g) => sum + (g._avg.rating ?? 0) * g._count._all, 0);
  return {
    asSeller: pick("SELLER"),
    asBuyer: pick("BUYER"),
    overall: { average: count ? Math.round((total / count) * 10) / 10 : null, count },
  };
}

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  /** The side of the deal the profile's owner was on. */
  revieweeRole: ReviewRole;
  listingId: string | null;
  listingTitle: string;
  createdAt: string;
  reviewer: Omit<PartyIdentity, "userId">;
};

const REVIEW_PAGE = 50;

/** The newest reviews someone has received, as either side of a deal. */
export async function getReviewsFor(userId: string): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { revieweeId: userId },
    orderBy: { createdAt: "desc" },
    take: REVIEW_PAGE,
    include: {
      reviewer: {
        include: {
          socials: { orderBy: { platform: "asc" } },
          wallets: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const reviewers = await fillRatings(reviews.map((review) => toIdentity(review.reviewer)));
  return reviews.map((review, index) => {
    // Public, so the reviewer's chat handle comes off like everywhere else.
    const { userId: _userId, ...reviewer } = reviewers[index];
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      revieweeRole: review.revieweeRole,
      listingId: review.listingId,
      listingTitle: review.listingTitle,
      createdAt: review.createdAt.toISOString(),
      reviewer,
    };
  });
}

export type OwnReview = { rating: number; comment: string | null };

/** What the user has already said about each of these deals, keyed by deal. */
export async function getOwnReviews(
  reviewerId: string,
  dealKeys: string[],
): Promise<Map<string, OwnReview>> {
  if (dealKeys.length === 0) return new Map();
  const reviews = await prisma.review.findMany({
    where: { reviewerId, dealKey: { in: dealKeys } },
    select: { dealKey: true, rating: true, comment: true },
  });
  return new Map(reviews.map((r) => [r.dealKey, { rating: r.rating, comment: r.comment }]));
}
