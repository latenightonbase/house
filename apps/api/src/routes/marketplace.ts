import { Elysia, t } from "elysia";
import { prisma } from "../db";
import { getUserFromRequest } from "../lib/session";
import { isSuperadmin } from "../lib/roles";
import { sendListingPurchased, sendOutbid } from "../lib/email";
import {
  serializeActivation,
  serializeAuction,
  serializeBooking,
  serializeCampaign,
  serializeCreatorToken,
  serializeEarner,
  serializeListing,
} from "../lib/marketplace";
import { verifyFixedPriceSale } from "../lib/listingSale";
import { verifyListingOnChain } from "../lib/listingChain";
import { getRecentSales } from "../lib/profileHistory";
import { isOwnPosterUrl } from "../lib/s3/s3Client";
import {
  findListingToken,
  imitatesKnownToken,
  listingToken,
  priceDecimals,
  resolveListingToken,
} from "../lib/tokens";
import { getTokenPrices, getTokenUsdPrice } from "../lib/tokenPrices";

/** Prices are entered to the cent; anything past that is a client bug, not a price. */
const MAX_PRICE = 1e15;
function validPrice(price: number) {
  return (
    Number.isFinite(price) &&
    price > 0 &&
    price <= MAX_PRICE &&
    Math.abs(Math.round(price * 100) - price * 100) < 1e-6
  );
}

/**
 * Live inventory: published, still has slots, and not past its end date.
 *
 * The slot check is belt and braces — booking already flips a listing to SOLD
 * as its last slot goes — but "sold out" and "still listed" must never be able
 * to describe the same row, whatever else edits `slotsAvailable`.
 */
const liveListingWhere = () => ({
  status: "ACTIVE" as const,
  slotsAvailable: { gt: 0 },
  OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
});

const creatorInclude = {
  user: { include: { socials: true, wallets: true } },
} as const;

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}\u2026${wallet.slice(-4)}`;
}

/** Username first, then a linked social, then the wallet — never an empty name. */
function bidderIdentity(
  wallet: string,
  user: {
    username: string | null;
    avatarUrl: string | null;
    socials: Array<{
      displayName: string | null;
      username: string | null;
      avatarUrl: string | null;
    }>;
  } | null,
) {
  const social = user?.socials.find((s) => s.displayName || s.username || s.avatarUrl);
  return {
    wallet,
    name:
      (user?.username ? `@${user.username}` : null) ||
      social?.displayName ||
      (social?.username ? `@${social.username}` : null) ||
      shortWallet(wallet),
    avatarUrl: user?.avatarUrl ?? social?.avatarUrl ?? null,
  };
}

type BidderUser = {
  username: string | null;
  avatarUrl: string | null;
  socials: Array<{
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  }>;
};

/** Everyone who has bid on a listing, one row per wallet, highest bid first. */
async function listingBidders(listingId: string) {
  const bids = await prisma.listingBid.findMany({
    where: { listingId },
    orderBy: [{ amount: "desc" }, { createdAt: "desc" }],
    include: { bidderUser: { include: { socials: true } } },
  });

  const byWallet = new Map<
    string,
    { wallet: string; amount: number; bidCount: number; lastBidAt: Date; user: BidderUser | null }
  >();

  for (const bid of bids) {
    const wallet = bid.bidderWallet.toLowerCase();
    const existing = byWallet.get(wallet);
    if (!existing) {
      byWallet.set(wallet, {
        wallet,
        amount: bid.amount,
        bidCount: 1,
        lastBidAt: bid.createdAt,
        user: bid.bidderUser,
      });
      continue;
    }
    existing.bidCount += 1;
    if (bid.amount > existing.amount) existing.amount = bid.amount;
    if (bid.createdAt > existing.lastBidAt) existing.lastBidAt = bid.createdAt;
  }

  const rows = [...byWallet.values()].sort((a, b) => b.amount - a.amount || b.lastBidAt.getTime() - a.lastBidAt.getTime());
  const leaderWallet = rows[0]?.wallet;

  return rows.map((row) => {
    const identity = bidderIdentity(row.wallet, row.user);
    return {
      wallet: row.wallet,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
      amount: row.amount,
      bidCount: row.bidCount,
      lastBidAt: row.lastBidAt.toISOString(),
      leading: row.wallet === leaderWallet,
    };
  });
}

/**
 * Every seller needs a public CreatorProfile to hang listings off. Verification
 * gating comes later — for now anyone with a session can list, so the profile
 * is created on first listing from whatever identity they have linked.
 */
async function ensureCreatorProfile(userId: string) {
  const existing = await prisma.creatorProfile.findUnique({ where: { userId } });
  if (existing) return existing;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { socials: true, wallets: true },
  });
  const social = user.socials.find((s) => s.displayName || s.username);
  const wallet = user.wallets.find((w) => w.isPrimary)?.address ?? user.wallets[0]?.address;

  return prisma.creatorProfile.create({
    data: {
      userId,
      displayName:
        user.username ??
        social?.displayName ??
        social?.username ??
        (wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "New creator"),
      username: user.username ?? social?.username ?? undefined,
      avatarUrl: user.avatarUrl ?? social?.avatarUrl ?? undefined,
      tags: [],
      trend: [],
    },
  });
}

/** Gates the moderation routes to a SUPERADMIN session. */
async function requireAdmin(request: Request, set: { status?: number | string }) {
  const user = await getUserFromRequest(request);
  if (!user || !isSuperadmin(user)) {
    set.status = 403;
    return { error: "Only an admin can manage listings" } as const;
  }
  return user;
}

/** Loads a listing only if the session user owns it. */
async function requireOwnedListing(
  request: Request,
  listingId: string,
  set: { status?: number | string },
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    set.status = 401;
    return { error: "Not authenticated" } as const;
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { creator: true },
  });
  if (!listing) {
    set.status = 404;
    return { error: "Listing not found" } as const;
  }
  if (listing.creator.userId !== user.id) {
    set.status = 403;
    return { error: "Not your listing" } as const;
  }
  return listing;
}

export const marketplaceRoutes = new Elysia()
  /**
   * Indicative USD prices for the listing tokens. Display only — a listing is
   * priced and paid in token units, so nothing that moves money reads these.
   */
  .get("/token-prices", async ({ set }) => {
    set.headers["cache-control"] = "public, max-age=30";
    return getTokenPrices();
  })
  /**
   * Looks up any Robinhood Chain ERC-20 by address for the create form — what
   * it is called, its decimals, and an indicative USD price. The form shows
   * this before a seller prices a listing in a token they pasted.
   */
  .get("/tokens/:address", async ({ params, set }) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(params.address)) {
      set.status = 400;
      return { error: "That is not a contract address" };
    }
    let token;
    try {
      token = await resolveListingToken(params.address);
    } catch (err) {
      console.error("[tokens] could not look up token:", err);
      set.status = 503;
      return { error: "Could not reach DexScreener or CoinGecko. Try again in a moment." };
    }
    if (!token) {
      set.status = 404;
      return {
        error: "Neither DexScreener nor CoinGecko lists a Robinhood Chain token at that address",
      };
    }
    if (imitatesKnownToken(token)) {
      set.status = 422;
      return {
        error: `This token calls itself ${token.symbol} but is not the one the marketplace lists — it can't be used.`,
      };
    }
    set.headers["cache-control"] = "public, max-age=30";
    return {
      token: {
        ...token,
        known: Boolean(findListingToken(token.address)),
        priceUsd: await getTokenUsdPrice(token.address),
      },
    };
  })
  /**
   * The market's headline figures, denominated in attention rather than
   * tokens: what was spent on media, who is selling, how much inventory
   * exists, and how much brand demand is open.
   */
  .get("/market-stats", async () => {
    const [mediaVolume, creators, listings, activeCampaigns] = await Promise.all([
      prisma.booking.aggregate({ _sum: { amount: true } }),
      prisma.creatorProfile.count(),
      prisma.listing.count({ where: liveListingWhere() }),
      prisma.campaign.count({ where: { status: "OPEN" } }),
    ]);

    return {
      mediaVolume: mediaVolume._sum.amount ?? 0,
      creators,
      listings,
      activeCampaigns,
    };
  })
  .get("/analytics", async () => {
    const [totalAuctions, auctionsWithBids, earnings, bidders] = await Promise.all([
      prisma.auction.count(),
      prisma.bid.findMany({ select: { auctionId: true }, distinct: ["auctionId"] }),
      prisma.booking.aggregate({ _sum: { amount: true } }),
      prisma.bid.findMany({ select: { bidderWallet: true }, distinct: ["bidderWallet"] }),
    ]);

    return {
      totalAuctions,
      auctionsWithBids: auctionsWithBids.length,
      totalEarnings: earnings._sum.amount ?? 0,
      uniqueBidders: bidders.length,
    };
  })
  .get("/auctions", async ({ query }) => {
    const live = query.status === "live";
    const limit = query.limit ? Number(query.limit) : 20;

    const auctions = await prisma.auction.findMany({
      where: live ? { endDate: { gt: new Date() } } : undefined,
      orderBy: { endDate: "asc" },
      take: limit,
      include: { bids: true, host: { include: creatorInclude } },
    });

    return { auctions: auctions.map(serializeAuction) };
  })
  .get("/creators", async ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 20;

    const profiles = await prisma.creatorProfile.findMany({
      include: { ...creatorInclude, auctions: { select: { id: true } }, bookings: true },
    });

    const creators = profiles
      .map(serializeEarner)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    return { creators };
  })
  .get("/creators/:id", async ({ params, set }) => {
    const profile = await prisma.creatorProfile.findUnique({
      where: { id: params.id },
      include: { ...creatorInclude, auctions: { select: { id: true } }, bookings: true },
    });
    if (!profile) {
      set.status = 404;
      return { error: "Creator not found" };
    }

    const [listings, token] = await Promise.all([
      prisma.listing.findMany({
        where: { creatorId: profile.id, ...liveListingWhere() },
        include: { creator: { include: creatorInclude } },
        orderBy: { price: "asc" },
      }),
      prisma.creatorToken.findUnique({
        where: { creatorId: profile.id },
        include: { creator: { include: creatorInclude } },
      }),
    ]);

    return {
      creator: serializeEarner(profile),
      listings: listings.map(serializeListing),
      token: token ? serializeCreatorToken(token) : null,
    };
  })
  /**
   * Seller inventory. Rows from the retired daily auction stay hidden (see
   * `Listing.isDaily`). Each row carries its live bid state so an auction card
   * can say what it actually stands at rather than its reserve.
   */
  .get("/listings", async ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 30;
    const platform = typeof query.platform === "string" ? query.platform : undefined;
    const category = typeof query.category === "string" ? query.category : undefined;
    const pricingType = typeof query.pricingType === "string" ? query.pricingType : undefined;

    const listings = await prisma.listing.findMany({
      where: {
        ...liveListingWhere(),
        isDaily: false,
        ...(platform && platform !== "all"
          ? { platform: platform.toUpperCase() as never }
          : {}),
        ...(category && category !== "all"
          ? { category: category.toUpperCase() as never }
          : {}),
        ...(pricingType && pricingType !== "all"
          ? { pricingType: pricingType.toUpperCase() as never }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        creator: { include: creatorInclude },
        bids: { orderBy: { amount: "desc" }, take: 1, select: { amount: true } },
        _count: { select: { bids: true } },
      },
    });

    return {
      listings: listings.map((listing) => ({
        ...serializeListing(listing),
        bidCount: listing._count.bids,
        highestBid: listing.bids[0]?.amount,
      })),
    };
  })
  /**
   * Recently sold — the latest purchases and won auctions with both sides of
   * each sale, for the home page. Public, so no chat handles are included.
   */
  .get("/listings/recent-sales", async ({ query }) => {
    const limit = Math.min(Math.max(Number(query.limit) || 5, 1), 20);
    return { sales: await getRecentSales(limit) };
  })
  /**
   * The seller's own listings, in every state — this is the only place a
   * PENDING_REVIEW, REJECTED or approved-but-unpublished row is visible, since
   * public reads filter to ACTIVE.
   */
  .get("/listings/mine", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }

    const listings = await prisma.listing.findMany({
      where: { creator: { userId: user.id }, isDaily: false },
      orderBy: { createdAt: "desc" },
      include: { creator: { include: creatorInclude } },
    });

    return { listings: listings.map(serializeListing) };
  })
  /**
   * Public bidder roll for an auction listing — each person who has bid and
   * their highest amount.
   */
  .get("/listings/:id/bidders", async ({ params, set }) => {
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!listing) {
      set.status = 404;
      return { error: "Listing not found" };
    }
    return { bidders: await listingBidders(listing.id) };
  })
  .get("/listings/:id", async ({ params, request, set }) => {
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: { creator: { include: creatorInclude } },
    });
    if (!listing) {
      set.status = 404;
      return { error: "Listing not found" };
    }

    // A listing that has not cleared review was never published, so it reads as
    // absent to everyone but its seller and an admin.
    const unpublished = listing.status === "PENDING_REVIEW" || listing.status === "REJECTED";
    if (unpublished) {
      const user = await getUserFromRequest(request);
      const maySee = user && (isSuperadmin(user) || listing.creator.userId === user.id);
      if (!maySee) {
        set.status = 404;
        return { error: "Listing not found" };
      }
    }

    return { listing: serializeListing(listing) };
  })
  /**
   * Creates a listing. It is already on-chain by the time it gets here —
   * everyone signs the AuctionHouse transaction as part of submitting, and
   * posts the same id back with the tx fields. Every listing is ACTIVE on
   * arrival; there is no review step, and an admin removes anything offensive
   * afterwards from `/admin/listings`.
   */
  .post(
    "/listings",
    async ({ body, request, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }

      if (!(body.txHash && body.chainId && body.contractAddress)) {
        set.status = 400;
        return { error: "A listing must be on-chain before it is saved" };
      }

      const endDate = new Date(body.endDate);
      if (Number.isNaN(endDate.getTime()) || endDate.getTime() <= Date.now()) {
        set.status = 400;
        return { error: "End date must be in the future" };
      }
      if (!validPrice(body.price)) {
        set.status = 400;
        return { error: "Price must be above zero, with at most two decimal places" };
      }
      // The seller's choice of token is the listing's for life: every bid and
      // purchase is paid in it. USDG, LNOC or any token entered by address —
      // looked up here, so the symbol and decimals saved are the token's own
      // rather than whatever the client sent.
      let token;
      try {
        token = await resolveListingToken(body.tokenAddress);
      } catch (err) {
        console.error("[listing] could not look up token:", err);
        set.status = 503;
        return { error: "Could not look up the token right now. Try again." };
      }
      if (!token) {
        set.status = 400;
        return {
          error: "Price the listing in USDG, LNOC or a Robinhood Chain token listed on DexScreener or CoinGecko",
        };
      }
      if (imitatesKnownToken(token)) {
        set.status = 400;
        return { error: `That token imitates ${token.symbol} and can't be used.` };
      }
      const places = priceDecimals(token);
      if (Math.abs(Math.round(body.price * 10 ** places) - body.price * 10 ** places) > 1e-6) {
        set.status = 400;
        return {
          error: places === 0
            ? `${token.symbol} has no decimals — use a whole-number price.`
            : `${token.symbol} only allows ${places} decimal place${places === 1 ? "" : "s"}.`,
        };
      }
      const posterUrl = body.posterUrl?.trim() || null;
      if (posterUrl && !isOwnPosterUrl(posterUrl, user.id)) {
        console.warn(`[listing] refused poster for user ${user.id}: ${posterUrl}`);
        set.status = 400;
        return { error: "Upload the poster again — that image link was not accepted" };
      }

      const existing = await prisma.listing.findUnique({ where: { id: body.id } });
      if (existing) {
        set.status = 409;
        return { error: "Listing already exists" };
      }

      // The chain is the proof the listing exists, not the hash the client
      // sends. The row goes live the moment it is saved, so a submission that
      // only claims to be on-chain has to fail here.
      const onchain = await verifyListingOnChain({
        id: body.id,
        price: body.price,
        token,
        pricingType: body.pricingType,
        endDate,
        chainId: body.chainId,
        contractAddress: body.contractAddress,
        wallets: user.wallets,
      });
      if (!onchain.ok) {
        set.status = onchain.status;
        return { error: onchain.error };
      }

      const creator = await ensureCreatorProfile(user.id);

      const listing = await prisma.listing.create({
        data: {
          id: body.id,
          title: body.title.trim(),
          description: body.description?.trim() || null,
          // No category picker any more — new rows take the schema's OTHER,
          // which every listing surface already renders without a label.
          pricingType: body.pricingType,
          price: body.price,
          currency: token.symbol,
          placement: body.placement?.trim() || null,
          platform: body.platform ?? null,
          turnaroundDays: body.turnaroundDays ?? null,
          slotsAvailable: body.pricingType === "AUCTION" ? 1 : (body.slotsAvailable ?? 1),
          posterUrl,
          endDate,
          status: "ACTIVE",
          txHash: body.txHash,
          chainId: body.chainId,
          contractAddress: body.contractAddress,
          tokenAddress: token.address,
          tokenName: token.symbol,
          tokenDecimals: token.decimals,
          creatorId: creator.id,
        },
        include: { creator: { include: creatorInclude } },
      });

      return { listing: serializeListing(listing) };
    },
    {
      body: t.Object({
        id: t.String({ minLength: 1, maxLength: 80 }),
        title: t.String({ minLength: 2, maxLength: 120 }),
        description: t.Optional(t.String({ maxLength: 2000 })),
        pricingType: t.Union([t.Literal("FIXED"), t.Literal("AUCTION")]),
        price: t.Number(),
        currency: t.Optional(t.String({ maxLength: 16 })),
        endDate: t.String(),
        placement: t.Optional(t.String({ maxLength: 80 })),
        platform: t.Optional(
          t.Union([
            t.Literal("YOUTUBE"),
            t.Literal("TWITTER"),
            t.Literal("INSTAGRAM"),
            t.Literal("TIKTOK"),
          ]),
        ),
        turnaroundDays: t.Optional(t.Number()),
        slotsAvailable: t.Optional(t.Number()),
        posterUrl: t.Optional(t.String({ maxLength: 700 })),
        // Every listing is written on-chain as part of submitting it, so these
        // are always present — kept optional in the schema only so a missing
        // one is answered with the handler's own message rather than a
        // validation error.
        txHash: t.Optional(t.String()),
        chainId: t.Optional(t.Number()),
        contractAddress: t.Optional(t.String()),
        // Required in practice — kept optional so a missing one gets the
        // handler's own message.
        tokenAddress: t.Optional(t.String()),
        tokenName: t.Optional(t.String()),
      }),
    },
  )
  /**
   * Moderation view — every live seller listing, newest first, with its bid
   * count so the panel can say up front which ones can still be removed.
   */
  .get("/admin/listings", async ({ request, set }) => {
    const admin = await requireAdmin(request, set);
    if ("error" in admin) return admin;

    const listings = await prisma.listing.findMany({
      where: { isDaily: false, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        creator: { include: creatorInclude },
        _count: { select: { bids: true } },
      },
    });

    return {
      listings: listings.map((listing) => ({
        ...serializeListing(listing),
        bidCount: listing._count.bids,
      })),
    };
  })
  /**
   * Deletes an offensive listing outright. Refused once anyone has bid: those
   * bidders have funds escrowed against it on-chain, and the row is what lets
   * the auction settle and refund them.
   *
   * Only the marketplace row goes — the AuctionHouse has no admin cancel, so
   * the on-chain entry lapses at its own deadline.
   */
  .delete("/admin/listings/:id", async ({ params, request, set }) => {
    const admin = await requireAdmin(request, set);
    if ("error" in admin) return admin;

    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!listing) {
      set.status = 404;
      return { error: "Listing not found" };
    }

    // The no-bids condition sits in the delete itself, so a bid recorded
    // between the panel loading and this request still blocks it.
    const { count } = await prisma.listing.deleteMany({
      where: { id: params.id, bids: { none: {} } },
    });
    if (count === 0) {
      set.status = 409;
      return { error: "This listing has bids, so it cannot be deleted" };
    }
    return { ok: true };
  })
  /**
   * Publishes an approved listing once its AuctionHouse transaction confirms.
   * The seller signs this themselves, so it is owner-gated rather than
   * admin-gated — approval already happened.
   *
   * Sellers now sign at submission, so nothing new lands in DRAFT and nothing
   * new comes through here. It stays for the rows approved under the old flow,
   * which are still waiting on their seller to publish them.
   */
  .post(
    "/listings/:id/activate",
    async ({ params, body, request, set }) => {
      const listing = await requireOwnedListing(request, params.id, set);
      if ("error" in listing) return listing;
      if (listing.status !== "DRAFT") {
        set.status = 409;
        return { error: "This listing is not waiting to be published" };
      }

      const updated = await prisma.listing.update({
        where: { id: params.id },
        data: {
          status: "ACTIVE",
          txHash: body.txHash,
          chainId: body.chainId,
          contractAddress: body.contractAddress,
          // A row this old was saved before sellers chose a token, so it was
          // published in the one its price was always quoted against.
          tokenAddress: listingToken(listing).address,
          tokenName: listingToken(listing).symbol,
          currency: listingToken(listing).symbol,
        },
        include: { creator: { include: creatorInclude } },
      });

      return { listing: serializeListing(updated) };
    },
    {
      body: t.Object({
        txHash: t.String(),
        chainId: t.Number(),
        contractAddress: t.String(),
        tokenAddress: t.Optional(t.String()),
        tokenName: t.Optional(t.String()),
      }),
    },
  )
  /**
   * Records a confirmed fixed-price purchase after the AuctionHouse
   * `buyListing` transaction lands. Decrements slots (SOLD at zero) and
   * writes a Booking so Recently Booked stays in sync.
   */
  .post(
    "/listings/:id/book",
    async ({ params, body, request, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }

      const listing = await prisma.listing.findUnique({
        where: { id: params.id },
        include: { creator: { include: creatorInclude } },
      });
      if (!listing) {
        set.status = 404;
        return { error: "Listing not found" };
      }
      if (listing.creator.userId === user.id) {
        set.status = 403;
        return { error: "You cannot book your own listing" };
      }
      if (listing.status !== "ACTIVE" || listing.slotsAvailable <= 0) {
        set.status = 400;
        return { error: "Listing is not available" };
      }
      if (listing.pricingType !== "FIXED") {
        set.status = 400;
        return { error: "Auction listings settle by bid, not instant book" };
      }

      // The chain is the proof of payment, not the hash the client sends.
      const sale = await verifyFixedPriceSale(listing, user.wallets);
      if (!sale.ok) {
        set.status = sale.status;
        return { error: sale.error };
      }

      const slotsLeft = Math.max(0, listing.slotsAvailable - 1);
      const updated = await prisma.listing.update({
        where: { id: listing.id },
        data: {
          slotsAvailable: slotsLeft,
          status: slotsLeft <= 0 ? "SOLD" : "ACTIVE",
        },
        include: { creator: { include: creatorInclude } },
      });

      const wallet = user.wallets.find((w) => w.isPrimary) ?? user.wallets[0];
      const social = user.socials.find((s) => s.displayName || s.username || s.avatarUrl);
      const brand = user.username
        ? `@${user.username}`
        : social?.displayName ||
          social?.username ||
          (wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : "Buyer");

      await prisma.booking.create({
        data: {
          brand,
          markUrl: user.avatarUrl ?? social?.avatarUrl ?? null,
          amount: listing.price,
          placement: listing.placement ?? listing.title,
          status: "CONFIRMED",
          creatorId: listing.creatorId,
        },
      });

      // Booking is the creator's display feed and stores a rendered name. The
      // Purchase row is the identity-bearing record: it is what lets the buyer
      // find this in their own history and message the seller about it.
      await prisma.purchase.create({
        data: {
          listingId: listing.id,
          buyerUserId: user.id,
          buyerWallet: sale.buyer,
          amount: listing.price,
          currency: listing.currency,
          txHash: body.txHash ?? null,
        },
      });

      if (user.email && user.emailVerifiedAt) {
        await sendListingPurchased(user.email, {
          title: listing.title,
          listingId: listing.id,
          amount: listing.price,
          currency: listing.currency,
        }).catch((err) => console.error("[email] listing-purchased failed:", err));
      }

      return { listing: serializeListing(updated), txHash: body.txHash ?? null };
    },
    {
      // Optional: the chain proves the sale, so a purchase whose session died
      // before it could report the hash can still be recorded afterwards.
      body: t.Object({
        txHash: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/listings/:id/bid",
    async ({ params, body, request, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }

      const listing = await prisma.listing.findUnique({
        where: { id: params.id },
        include: {
          creator: { include: creatorInclude },
          bids: { orderBy: { amount: "desc" }, take: 1 },
        },
      });
      if (!listing) {
        set.status = 404;
        return { error: "Listing not found" };
      }
      // A leftover daily-auction row is closed to new bids: the billboard it
      // sold no longer exists, so it just runs out and settles.
      if (listing.pricingType !== "AUCTION" || listing.status !== "ACTIVE" || listing.isDaily) {
        set.status = 400;
        return { error: "This listing is not open for bids" };
      }
      if (listing.creator.userId === user.id) {
        set.status = 403;
        return { error: "You cannot bid on your own listing" };
      }
      if (!Number.isFinite(body.amount) || body.amount <= 0) {
        set.status = 400;
        return { error: "Bid must be greater than zero" };
      }

      const wallet = user.wallets.find((w) => w.isPrimary) ?? user.wallets[0];
      if (!wallet) {
        set.status = 400;
        return { error: "No wallet on this account" };
      }

      const previous = listing.bids[0] ?? null;
      const bid = await prisma.listingBid.create({
        data: {
          listingId: listing.id,
          bidderUserId: user.id,
          bidderWallet: wallet.address.toLowerCase(),
          amount: body.amount,
          txHash: body.txHash,
        },
      });

      if (
        previous &&
        previous.bidderWallet.toLowerCase() !== wallet.address.toLowerCase() &&
        previous.bidderUserId
      ) {
        const prevUser = await prisma.user.findUnique({
          where: { id: previous.bidderUserId },
          select: { email: true, emailVerifiedAt: true },
        });
        if (prevUser?.email && prevUser.emailVerifiedAt) {
          await sendOutbid(prevUser.email, {
            title: listing.title,
            listingId: listing.id,
            previousBid: previous.amount,
            newBid: body.amount,
            currency: listing.currency,
          }).catch((err) => console.error("[email] outbid failed:", err));
        }
      }

      return {
        ok: true,
        bidId: bid.id,
        listing: serializeListing(listing),
      };
    },
    {
      body: t.Object({
        amount: t.Number(),
        txHash: t.String(),
      }),
    },
  )
  /**
   * Drops a listing. A seller uses this to retire a rejected submission, or to
   * clean up a row whose transaction never landed. The AuctionHouse entry is not
   * touched: a rejected auction can be closed by its owner with `endAuction`,
   * and a fixed-price one simply lapses at its deadline.
   */
  .post("/listings/:id/cancel", async ({ params, request, set }) => {
    const listing = await requireOwnedListing(request, params.id, set);
    if ("error" in listing) return listing;

    await prisma.listing.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });
    return { ok: true };
  })
  .get("/bookings", async ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 5;

    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { creator: true },
    });

    return { bookings: bookings.map(serializeBooking) };
  })
  .get("/campaigns", async ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 30;

    const campaigns = await prisma.campaign.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: limit,
      include: { applications: { select: { id: true } } },
    });

    return { campaigns: campaigns.map(serializeCampaign) };
  })
  .get("/campaigns/latest", async () => {
    const campaign = await prisma.campaign.findFirst({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: { applications: { select: { id: true } } },
    });
    return { campaign: campaign ? serializeCampaign(campaign) : null };
  })
  .get("/activations", async ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 30;

    const activations = await prisma.activation.findMany({
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      take: limit,
      include: { vault: true },
    });

    return { activations: activations.map(serializeActivation) };
  })
  .get("/creator-tokens", async ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 30;

    const tokens = await prisma.creatorToken.findMany({
      orderBy: { holders: "desc" },
      take: limit,
      include: { creator: { include: creatorInclude } },
    });

    return { tokens: tokens.map(serializeCreatorToken) };
  });
