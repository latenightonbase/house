import { Elysia, t } from "elysia";
import { getUserFromRequest } from "../lib/session";
import {
  getProfileHeader,
  getPurchaseHistory,
  getSalesHistory,
  resolveUserId,
  type PurchaseRecord,
  type SaleRecord,
} from "../lib/profileHistory";
import {
  MAX_REVIEW_COMMENT,
  getOwnReviews,
  getReviewSummary,
  getReviewsFor,
  submitReview,
} from "../lib/reviews";

/**
 * Profile history, in two flavours from one set of builders.
 *
 * `/profile/*` is the signed-in user's own view and is the only place that
 * exposes the counterparty's `userId` — that id is what the contact button
 * opens a chat against. The public `/users/:handle` view returns the same
 * records with every `userId` stripped, so a visitor can see who won what and
 * for how much without gaining a way to message strangers from a profile page.
 */

/** Removes the chat handle from a party, leaving the visible identity intact. */
function withoutUserId<T extends { userId: string | null }>(party: T): Omit<T, "userId"> {
  const { userId: _userId, ...rest } = party;
  return rest;
}

/**
 * Marks each sale and purchase with the review the signed-in user already left
 * for it, so the history can offer "Rate" or show the stars they gave. Only
 * deals with someone on the other side can be rated — a winner who never
 * signed in has no profile to put a review on.
 */
async function withOwnReviews(userId: string, sales: SaleRecord[], purchases: PurchaseRecord[]) {
  const keys = [
    ...sales.flatMap((sale) => sale.counterparties.map((c) => c.dealKey)),
    ...purchases.map((purchase) => purchase.dealKey),
  ];
  const mine = await getOwnReviews(userId, keys);
  return {
    sales: sales.map((sale) => ({
      ...sale,
      counterparties: sale.counterparties.map((c) => ({
        ...c,
        myReview: mine.get(c.dealKey) ?? null,
      })),
    })),
    purchases: purchases.map((purchase) => ({
      ...purchase,
      myReview: mine.get(purchase.dealKey) ?? null,
    })),
  };
}

export const profileRoutes = new Elysia()
  /** The signed-in user's sales and who won them — contactable. */
  .get("/profile/sales", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }
    const { sales } = await withOwnReviews(user.id, await getSalesHistory(user.id), []);
    return { sales };
  })
  /** What the signed-in user bought or won — each with its seller, contactable. */
  .get("/profile/purchases", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }
    const { purchases } = await withOwnReviews(user.id, [], await getPurchaseHistory(user.id));
    return { purchases };
  })
  .get("/profile/overview", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }

    const [profile, sales, purchases, rating, reviews] = await Promise.all([
      getProfileHeader(user.id),
      getSalesHistory(user.id),
      getPurchaseHistory(user.id),
      getReviewSummary(user.id),
      getReviewsFor(user.id),
    ]);

    return {
      profile: profile && { ...profile, rating },
      ...(await withOwnReviews(user.id, sales, purchases)),
      reviews,
    };
  })
  /**
   * Anyone's public profile. Accepts a user id or a username so the route reads
   * as `/user/alice` as happily as `/user/<cuid>`.
   */
  .get("/users/:handle/profile", async ({ params, set }) => {
    const userId = await resolveUserId(params.handle);
    if (!userId) {
      set.status = 404;
      return { error: "User not found" };
    }

    const [profile, sales, purchases, rating, reviews] = await Promise.all([
      getProfileHeader(userId),
      getSalesHistory(userId),
      getPurchaseHistory(userId),
      getReviewSummary(userId),
      getReviewsFor(userId),
    ]);
    if (!profile) {
      set.status = 404;
      return { error: "User not found" };
    }

    return {
      profile: { ...profile, rating },
      reviews,
      sales: sales.map((sale) => ({
        ...sale,
        counterparties: sale.counterparties.map(withoutUserId),
      })),
      purchases: purchases.map((purchase) => ({
        ...purchase,
        seller: withoutUserId(purchase.seller),
      })),
    };
  })
  /**
   * Rates the other side of a completed deal. The deal decides who is being
   * reviewed and in which role; the caller only says which deal and how it
   * went. Sending again for the same deal edits the earlier review.
   */
  .post(
    "/reviews",
    async ({ body, request, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }
      const result = await submitReview(user.id, body);
      if (!result.ok) {
        set.status = result.status;
        return { error: result.error };
      }
      return { review: result.review };
    },
    {
      body: t.Object({
        dealKey: t.String({ minLength: 3, maxLength: 120 }),
        rating: t.Number(),
        // A little over the real limit, so a long one gets the handler's own message.
        comment: t.Optional(t.Nullable(t.String({ maxLength: MAX_REVIEW_COMMENT * 2 }))),
      }),
    },
  );
