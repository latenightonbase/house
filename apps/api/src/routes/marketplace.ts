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

const CATEGORIES = [
  "SHOUTOUT",
  "SPONSORED_POST",
  "VIDEO_INTEGRATION",
  "DEDICATED_VIDEO",
  "LIVESTREAM",
  "PODCAST",
  "NEWSLETTER",
  "AMA",
  "COLLAB",
  "CONSULTING",
  "OTHER",
] as const;

/** Live inventory: published, still has slots, and not past its end date. */
const liveListingWhere = () => ({
  status: "ACTIVE" as const,
  OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
});

const creatorInclude = {
  user: { include: { socials: true, wallets: true } },
} as const;

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
  .get("/listings", async ({ query }) => {
    const limit = query.limit ? Number(query.limit) : 30;
    const platform = typeof query.platform === "string" ? query.platform : undefined;
    const category = typeof query.category === "string" ? query.category : undefined;
    const pricingType = typeof query.pricingType === "string" ? query.pricingType : undefined;

    const listings = await prisma.listing.findMany({
      where: {
        ...liveListingWhere(),
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
      include: { creator: { include: creatorInclude } },
    });

    return { listings: listings.map(serializeListing) };
  })
  .get("/listings/daily", async () => {
    const listing = await prisma.listing.findFirst({
      where: {
        isDaily: true,
        status: "ACTIVE",
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
      orderBy: { endDate: "asc" },
      include: { creator: { include: creatorInclude } },
    });
    return { listing: listing ? serializeListing(listing) : null };
  })
  .get("/listings/:id", async ({ params, set }) => {
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: { creator: { include: creatorInclude } },
    });
    if (!listing) {
      set.status = 404;
      return { error: "Listing not found" };
    }
    return { listing: serializeListing(listing) };
  })
  /**
   * Persists a listing after its AuctionHouse transaction has confirmed.
   * The client generates the id, writes it on-chain, then posts that same id
   * here with the tx fields. The row is ACTIVE immediately.
   */
  .post(
    "/listings",
    async ({ body, request, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }
      if (!isSuperadmin(user)) {
        set.status = 403;
        return { error: "Only SUPERADMIN can create listings" };
      }

      const endDate = new Date(body.endDate);
      if (Number.isNaN(endDate.getTime()) || endDate.getTime() <= Date.now()) {
        set.status = 400;
        return { error: "End date must be in the future" };
      }
      if (body.price <= 0) {
        set.status = 400;
        return { error: "Price must be greater than zero" };
      }

      const existing = await prisma.listing.findUnique({ where: { id: body.id } });
      if (existing) {
        set.status = 409;
        return { error: "Listing already exists" };
      }

      const isDaily = Boolean(body.isDaily);
      if (isDaily && body.pricingType !== "AUCTION") {
        set.status = 400;
        return { error: "The daily auction must be priced as an auction." };
      }
      if (isDaily) {
        const liveDaily = await prisma.listing.findFirst({
          where: { isDaily: true, status: "ACTIVE", settledAt: null },
        });
        if (liveDaily) {
          set.status = 409;
          return { error: "A daily auction is already live. Wait for it to close." };
        }
      }

      const creator = await ensureCreatorProfile(user.id);

      const listing = await prisma.listing.create({
        data: {
          id: body.id,
          title: body.title.trim(),
          description: body.description?.trim() || null,
          category: body.category,
          pricingType: body.pricingType,
          price: Math.round(body.price),
          currency: body.currency ?? "USDG",
          placement: body.placement?.trim() || null,
          platform: body.platform ?? null,
          turnaroundDays: body.turnaroundDays ?? null,
          slotsAvailable: body.pricingType === "AUCTION" ? 1 : (body.slotsAvailable ?? 1),
          endDate,
          status: "ACTIVE",
          isDaily,
          txHash: body.txHash,
          chainId: body.chainId,
          contractAddress: body.contractAddress,
          tokenAddress: body.tokenAddress,
          tokenName: body.tokenName ?? null,
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
        category: t.Union(CATEGORIES.map((c) => t.Literal(c))),
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
        txHash: t.String(),
        chainId: t.Number(),
        contractAddress: t.String(),
        tokenAddress: t.String(),
        tokenName: t.Optional(t.String()),
        isDaily: t.Optional(t.Boolean()),
      }),
    },
  )
  /** Publishes a DRAFT once its AuctionHouse transaction has confirmed. */
  .post(
    "/listings/:id/activate",
    async ({ params, body, request, set }) => {
      const listing = await requireOwnedListing(request, params.id, set);
      if ("error" in listing) return listing;
      const owner = await getUserFromRequest(request);
      if (!isSuperadmin(owner)) {
        set.status = 403;
        return { error: "Only SUPERADMIN can activate listings" };
      }

      const updated = await prisma.listing.update({
        where: { id: params.id },
        data: {
          status: "ACTIVE",
          txHash: body.txHash,
          chainId: body.chainId,
          contractAddress: body.contractAddress,
          tokenAddress: body.tokenAddress,
          tokenName: body.tokenName ?? null,
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
        tokenAddress: t.String(),
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

      if (user.email && user.emailVerifiedAt) {
        await sendListingPurchased(user.email, {
          title: listing.title,
          listingId: listing.id,
          amount: listing.price,
        }).catch((err) => console.error("[email] listing-purchased failed:", err));
      }

      return { listing: serializeListing(updated), txHash: body.txHash };
    },
    {
      body: t.Object({
        txHash: t.String(),
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
      if (listing.pricingType !== "AUCTION" || listing.status !== "ACTIVE") {
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
          amount: Math.round(body.amount),
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
            newBid: Math.round(body.amount),
          }).catch((err) => console.error("[email] outbid failed:", err));
        }
      }

      return { ok: true, bidId: bid.id, listing: serializeListing(listing) };
    },
    {
      body: t.Object({
        amount: t.Number(),
        txHash: t.String(),
      }),
    },
  )
  /** Drops a listing — used to clean up a draft whose transaction never landed. */
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
