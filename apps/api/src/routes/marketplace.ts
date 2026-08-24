import { Elysia } from "elysia";
import { prisma } from "../db";
import {
  serializeActivation,
  serializeAuction,
  serializeBooking,
  serializeCampaign,
  serializeCreatorToken,
  serializeEarner,
  serializeListing,
} from "../lib/marketplace";

const creatorInclude = {
  user: { include: { socials: true, wallets: true } },
} as const;

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
      prisma.listing.count({ where: { active: true } }),
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
        where: { creatorId: profile.id, active: true },
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

    const listings = await prisma.listing.findMany({
      where: {
        active: true,
        ...(platform && platform !== "all"
          ? { platform: platform.toUpperCase() as never }
          : {}),
      },
      orderBy: { price: "asc" },
      take: limit,
      include: { creator: { include: creatorInclude } },
    });

    return { listings: listings.map(serializeListing) };
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
