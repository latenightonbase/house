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
import { getDailyProject, getWinningProject, saveDailyProject } from "../lib/dailyProject";
import { buildShowcase } from "../lib/dailyAuction";

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

/**
 * The project a bidder is pitching. Only the name is required — description,
 * artwork and socials are optional, matching what the billboard can render
 * without them.
 */
const dailyProjectBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 80 }),
  description: t.Optional(t.Union([t.String({ maxLength: 600 }), t.Null()])),
  imageUrl: t.Optional(t.Union([t.String({ maxLength: 600 }), t.Null()])),
  websiteUrl: t.Optional(t.Union([t.String({ maxLength: 300 }), t.Null()])),
  twitterUrl: t.Optional(t.Union([t.String({ maxLength: 300 }), t.Null()])),
  youtubeUrl: t.Optional(t.Union([t.String({ maxLength: 300 }), t.Null()])),
});

/** Live inventory: published, still has slots, and not past its end date. */
const liveListingWhere = () => ({
  status: "ACTIVE" as const,
  OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
});

const creatorInclude = {
  user: { include: { socials: true, wallets: true } },
} as const;

/** The bid shape the daily-auction UI reads: leader, tally, and current price. */
async function dailyAuctionState(listingId: string, reservePrice: number) {
  const [bids, bidderRows] = await Promise.all([
    prisma.listingBid.findMany({
      where: { listingId },
      orderBy: { amount: "desc" },
      take: 1,
      include: {
        bidderUser: { include: { socials: true, wallets: true } },
      },
    }),
    prisma.listingBid.groupBy({ by: ["bidderWallet"], where: { listingId }, _count: true }),
  ]);

  const top = bids[0] ?? null;
  const bidCount = bidderRows.reduce((sum, row) => sum + row._count, 0);
  const leaderProject = top ? await getDailyProject(listingId, top.bidderWallet) : null;

  return {
    currentBid: top?.amount ?? reservePrice,
    reservePrice,
    bidCount,
    bidderCount: bidderRows.length,
    leader: top
      ? {
          wallet: top.bidderWallet,
          /** Prefers the pitched project name — that is what the leaderboard shows. */
          name:
            leaderProject?.name ||
            (top.bidderUser?.username ? `@${top.bidderUser.username}` : null) ||
            `${top.bidderWallet.slice(0, 6)}\u2026${top.bidderWallet.slice(-4)}`,
          avatarUrl: leaderProject?.imageUrl ?? top.bidderUser?.avatarUrl ?? null,
          amount: top.amount,
        }
      : null,
  };
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
  /**
   * Tomorrow's auction — the one live daily listing, with the live bid state
   * the home page's countdown panel renders.
   */
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
    if (!listing) return { listing: null, auction: null };
    return {
      listing: serializeListing(listing),
      auction: await dailyAuctionState(listing.id, listing.price),
    };
  })
  /**
   * Today's Attention — the winning pitch from the auction that closed most
   * recently, on the billboard for its 24 hours. Falls back to nothing while a
   * settled auction has no pitch attached (an auction created before pitches
   * existed, or one that closed with no bids).
   */
  .get("/listings/daily/spotlight", async () => {
    const since = new Date(Date.now() - 24 * 3_600_000);
    const listing = await prisma.listing.findFirst({
      where: { isDaily: true, settledAt: { not: null, gte: since }, winnerWallet: { not: null } },
      orderBy: { settledAt: "desc" },
      include: { bids: { orderBy: { amount: "desc" }, take: 1 } },
    });
    if (!listing) return { spotlight: null };

    const project = await getWinningProject(listing.id, listing.winnerWallet);
    return {
      spotlight: buildShowcase(listing, project, listing.bids[0]?.amount ?? listing.price),
    };
  })
  /**
   * Leaderboard — bidders ranked by total committed across every daily auction,
   * with their wins. Built from bid rows rather than a running tally so it stays
   * correct without a counter to keep in sync.
   */
  .get("/listings/daily/leaderboard", async ({ query }) => {
    const limit = Math.min(Number(query.limit) || 25, 100);

    const dailyIds = (
      await prisma.listing.findMany({ where: { isDaily: true }, select: { id: true } })
    ).map((l) => l.id);
    if (dailyIds.length === 0) return { leaders: [] };

    const [grouped, wins, projects] = await Promise.all([
      prisma.listingBid.groupBy({
        by: ["bidderWallet"],
        where: { listingId: { in: dailyIds } },
        _sum: { amount: true },
        _max: { amount: true },
        _count: { _all: true },
      }),
      prisma.listing.findMany({
        where: { isDaily: true, winnerWallet: { not: null } },
        select: { winnerWallet: true },
      }),
      prisma.dailyProject.findMany({
        where: { listingId: { in: dailyIds } },
        orderBy: { updatedAt: "desc" },
        select: { bidderWallet: true, name: true, imageUrl: true },
      }),
    ]);

    const winCounts = new Map<string, number>();
    for (const row of wins) {
      const wallet = row.winnerWallet!.toLowerCase();
      winCounts.set(wallet, (winCounts.get(wallet) ?? 0) + 1);
    }
    // Newest pitch per wallet wins — `projects` is already sorted by recency.
    const latestProject = new Map<string, { name: string; imageUrl: string | null }>();
    for (const p of projects) {
      if (!latestProject.has(p.bidderWallet)) {
        latestProject.set(p.bidderWallet, { name: p.name, imageUrl: p.imageUrl });
      }
    }

    const leaders = grouped
      .map((row) => {
        const wallet = row.bidderWallet.toLowerCase();
        const project = latestProject.get(wallet);
        return {
          wallet,
          name: project?.name ?? `${wallet.slice(0, 6)}\u2026${wallet.slice(-4)}`,
          imageUrl: project?.imageUrl ?? null,
          totalBid: row._sum.amount ?? 0,
          highestBid: row._max.amount ?? 0,
          bidCount: row._count._all,
          wins: winCounts.get(wallet) ?? 0,
        };
      })
      .sort((a, b) => b.wins - a.wins || b.totalBid - a.totalBid)
      .slice(0, limit);

    return { leaders };
  })
  /** Past Winners — every settled daily auction that put a project on the billboard. */
  .get("/listings/daily/winners", async ({ query }) => {
    const limit = Math.min(Number(query.limit) || 24, 100);
    const listings = await prisma.listing.findMany({
      where: { isDaily: true, settledAt: { not: null }, winnerWallet: { not: null } },
      orderBy: { settledAt: "desc" },
      take: limit,
      include: {
        bids: { orderBy: { amount: "desc" }, take: 1 },
        projects: true,
      },
    });

    const winners = listings
      .map((listing) => {
        const project = listing.projects.find(
          (p) => p.bidderWallet === listing.winnerWallet?.toLowerCase(),
        );
        if (!project) return null;
        return {
          listingId: listing.id,
          name: project.name,
          description: project.description,
          imageUrl: project.imageUrl,
          websiteUrl: project.websiteUrl,
          twitterUrl: project.twitterUrl,
          youtubeUrl: project.youtubeUrl,
          winnerWallet: listing.winnerWallet,
          winningBid: listing.bids[0]?.amount ?? listing.price,
          settledAt: listing.settledAt?.toISOString() ?? null,
        };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);

    return { winners };
  })
  /**
   * The signed-in bidder's saved pitch for one auction. Returning it lets the
   * bid dialog prefill, so re-bidding after being outbid never re-asks.
   */
  .get("/listings/:id/project", async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }
    const wallet = user.wallets.find((w) => w.isPrimary) ?? user.wallets[0];
    if (!wallet) return { project: null };
    return { project: await getDailyProject(params.id, wallet.address) };
  })
  /** Saves the pitch ahead of (or alongside) a bid. */
  .put(
    "/listings/:id/project",
    async ({ params, body, request, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }
      const wallet = user.wallets.find((w) => w.isPrimary) ?? user.wallets[0];
      if (!wallet) {
        set.status = 400;
        return { error: "No wallet on this account" };
      }

      const listing = await prisma.listing.findUnique({ where: { id: params.id } });
      if (!listing) {
        set.status = 404;
        return { error: "Listing not found" };
      }
      if (listing.status !== "ACTIVE") {
        set.status = 400;
        return { error: "This auction is closed" };
      }

      const project = await saveDailyProject(params.id, wallet.address, user.id, body);
      return { project };
    },
    { body: dailyProjectBody },
  )
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
          price: body.price,
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

      /**
       * A daily-auction bid carries the project pitch. It is saved before the
       * bid row so a winner always has something to put on the billboard; when
       * the dialog sends nothing, the pitch stored on an earlier bid stands,
       * which is what makes re-bidding after an outbid a one-field action.
       */
      if (listing.isDaily) {
        if (body.project) {
          await saveDailyProject(listing.id, wallet.address, user.id, body.project);
        } else {
          const existing = await getDailyProject(listing.id, wallet.address);
          if (!existing) {
            set.status = 400;
            return { error: "Add your project details before bidding on the daily auction" };
          }
        }
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
          }).catch((err) => console.error("[email] outbid failed:", err));
        }
      }

      return {
        ok: true,
        bidId: bid.id,
        listing: serializeListing(listing),
        auction: await dailyAuctionState(listing.id, listing.price),
      };
    },
    {
      body: t.Object({
        amount: t.Number(),
        txHash: t.String(),
        project: t.Optional(dailyProjectBody),
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
