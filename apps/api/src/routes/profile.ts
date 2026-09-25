import { Elysia } from "elysia";
import { getUserFromRequest } from "../lib/session";
import {
  getProfileHeader,
  getPurchaseHistory,
  getSalesHistory,
  resolveUserId,
} from "../lib/profileHistory";

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

export const profileRoutes = new Elysia()
  /** The signed-in user's sales and who won them — contactable. */
  .get("/profile/sales", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }
    return { sales: await getSalesHistory(user.id) };
  })
  /** What the signed-in user bought or won — each with its seller, contactable. */
  .get("/profile/purchases", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }
    return { purchases: await getPurchaseHistory(user.id) };
  })
  .get("/profile/overview", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }

    const [profile, sales, purchases] = await Promise.all([
      getProfileHeader(user.id),
      getSalesHistory(user.id),
      getPurchaseHistory(user.id),
    ]);

    return { profile, sales, purchases };
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

    const [profile, sales, purchases] = await Promise.all([
      getProfileHeader(userId),
      getSalesHistory(userId),
      getPurchaseHistory(userId),
    ]);
    if (!profile) {
      set.status = 404;
      return { error: "User not found" };
    }

    return {
      profile,
      sales: sales.map((sale) => ({
        ...sale,
        counterparties: sale.counterparties.map(withoutUserId),
      })),
      purchases: purchases.map((purchase) => ({
        ...purchase,
        seller: withoutUserId(purchase.seller),
      })),
    };
  });
