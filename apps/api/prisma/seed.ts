import { PrismaClient, SocialPlatform } from "@prisma/client";
import { encrypt } from "../src/lib/crypto";

const prisma = new PrismaClient();
const HOUR = 1000 * 60 * 60;
const hoursFromNow = (h: number) => new Date(Date.now() + h * HOUR);
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR);

/**
 * Brand marks. Real logos are hotlinked from the brand's own X avatar so no
 * third-party image files are committed; the rest are placeholders until a
 * real mark is supplied. `BrandAvatar` falls back to a generated monogram if
 * any of these fail to load.
 */
const BRAND_MARKS = {
  robinhood: "https://pbs.twimg.com/profile_images/1844399977482813442/1fTlYz2c_400x400.png",
  base: "https://i.pravatar.cc/150?u=brand-base",
  coinbase: "https://i.pravatar.cc/150?u=brand-coinbase",
  phantom: "https://i.pravatar.cc/150?u=brand-phantom",
  jupiter: "https://i.pravatar.cc/150?u=brand-jupiter",
  uniswap: "https://i.pravatar.cc/150?u=brand-uniswap",
} as const;

type SeedSocial = {
  platform: SocialPlatform;
  platformUserId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  followerCount: number;
};

type SeedProfile = {
  displayName: string;
  username: string;
  avatarUrl: string;
  verified: boolean;
  tags: string[];
  engagementPct: number;
  trend: number[];
  fromPrice: number;
  averageRating: number;
  totalReviews: number;
};

type SeedUser = {
  address: string;
  chainId: number;
  socials: SeedSocial[];
  profile: SeedProfile;
};

const SEED_USERS: SeedUser[] = [
  {
    address: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    chainId: 8453,
    socials: [
      {
        platform: "YOUTUBE",
        platformUserId: "yt_alice_builds",
        username: "alicebuilds",
        displayName: "Alice Builds",
        avatarUrl: "https://i.pravatar.cc/150?u=alicebuilds-yt",
        followerCount: 48200,
      },
      {
        platform: "TWITTER",
        platformUserId: "tw_alice_builds",
        username: "alicebuilds",
        displayName: "Alice Builds",
        avatarUrl: "https://i.pravatar.cc/150?u=alicebuilds-tw",
        followerCount: 12500,
      },
    ],
    profile: {
      displayName: "Alice Builds",
      username: "alicebuilds",
      avatarUrl: "https://i.pravatar.cc/150?u=alicebuilds-yt",
      verified: true,
      tags: ["Research", "Education"],
      engagementPct: 6.8,
      trend: [22, 26, 24, 31, 29, 35, 33, 30, 38, 36, 44, 41, 47, 45],
      fromPrice: 6000,
      averageRating: 4.9,
      totalReviews: 64,
    },
  },
  {
    address: "0x2e5b3b1a0c9d4f6e8a7c1b2d3e4f5a6b7c8d9e0f",
    chainId: 8453,
    socials: [
      {
        platform: "INSTAGRAM",
        platformUserId: "ig_marco_frames",
        username: "marco.frames",
        displayName: "Marco Frames",
        avatarUrl: "https://i.pravatar.cc/150?u=marcoframes-ig",
        followerCount: 91400,
      },
      {
        platform: "TIKTOK",
        platformUserId: "tt_marco_frames",
        username: "marco.frames",
        displayName: "Marco Frames",
        avatarUrl: "https://i.pravatar.cc/150?u=marcoframes-tt",
        followerCount: 203800,
      },
    ],
    profile: {
      displayName: "Marco Frames",
      username: "marco.frames",
      avatarUrl: "https://i.pravatar.cc/150?u=marcoframes-ig",
      verified: true,
      tags: ["Design", "Video"],
      engagementPct: 7.2,
      trend: [18, 22, 20, 27, 25, 33, 38, 44],
      fromPrice: 3200,
      averageRating: 4.7,
      totalReviews: 41,
    },
  },
  {
    address: "0x9a1b2c3d4e5f60718293a4b5c6d7e8f901234567",
    chainId: 1,
    socials: [
      {
        platform: "YOUTUBE",
        platformUserId: "yt_priya_codes",
        username: "priyacodes",
        displayName: "Priya Codes",
        avatarUrl: "https://i.pravatar.cc/150?u=priyacodes-yt",
        followerCount: 5600,
      },
      {
        platform: "TWITTER",
        platformUserId: "tw_priya_codes",
        username: "priyacodes",
        displayName: "Priya Codes",
        avatarUrl: "https://i.pravatar.cc/150?u=priyacodes-tw",
        followerCount: 30250,
      },
      {
        platform: "INSTAGRAM",
        platformUserId: "ig_priya_codes",
        username: "priya.codes",
        displayName: "Priya Codes",
        avatarUrl: "https://i.pravatar.cc/150?u=priyacodes-ig",
        followerCount: 8900,
      },
      {
        platform: "TIKTOK",
        platformUserId: "tt_priya_codes",
        username: "priya.codes",
        displayName: "Priya Codes",
        avatarUrl: "https://i.pravatar.cc/150?u=priyacodes-tt",
        followerCount: 41200,
      },
    ],
    profile: {
      displayName: "Priya Codes",
      username: "priyacodes",
      avatarUrl: "https://i.pravatar.cc/150?u=priyacodes-yt",
      verified: true,
      tags: ["Dev", "Education"],
      engagementPct: 5.1,
      trend: [20, 23, 21, 25, 24, 28, 26, 31],
      fromPrice: 2400,
      averageRating: 4.8,
      totalReviews: 58,
    },
  },
  {
    address: "0xf06207e32365a4f574fd4dfbe9db5be70002b2a4",
    chainId: 8453,
    socials: [
      {
        platform: "TWITTER",
        platformUserId: "x_lateniteonchain",
        username: "lateniteonchain",
        displayName: "Bill- Late Night Onchain",
        avatarUrl: "https://pbs.twimg.com/profile_images/2040941671605731328/ll5bSeLt_400x400.jpg",
        followerCount: 16100,
      },
    ],
    profile: {
      displayName: "Bill- Late Night Onchain",
      username: "lateniteonchain",
      avatarUrl: "https://pbs.twimg.com/profile_images/2040941671605731328/ll5bSeLt_400x400.jpg",
      verified: true,
      tags: ["Crypto", "Base", "Live Streaming"],
      engagementPct: 9.4,
      trend: [28, 33, 30, 38, 42, 39, 47, 52, 49, 58, 55, 64, 61, 70],
      fromPrice: 8000,
      averageRating: 4.9,
      totalReviews: 118,
    },
  },
];

type SeedBid = {
  bidderWallet: string;
  bidderName: string;
  bidderAvatarUrl: string;
  amount: number;
};

type SeedAuction = {
  hostAddress: string;
  title: string;
  description: string;
  minimumBid: number;
  avgViews: string;
  tags: string[];
  startHoursAgo: number;
  endHoursFromNow: number;
  createdBy: "HUMAN" | "BOT";
  featured?: boolean;
  bids: SeedBid[];
};

const SEED_AUCTIONS: SeedAuction[] = [
  {
    hostAddress: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    title: "Alice Builds — September Slate",
    description: "Presenting sponsor across the September slate — video, newsletter and X.",
    minimumBid: 6000,
    avgViews: "640K",
    tags: ["Research", "Macro", "Education"],
    startHoursAgo: 72,
    endHoursFromNow: 50,
    createdBy: "HUMAN",
    bids: [
      { bidderWallet: "0xB1d0000000000000000000000000000000a001", bidderName: "Base", bidderAvatarUrl: BRAND_MARKS.base, amount: 14500 },
      { bidderWallet: "0xB1d0000000000000000000000000000000a002", bidderName: "Robinhood", bidderAvatarUrl: BRAND_MARKS.robinhood, amount: 9000 },
    ],
  },
  {
    hostAddress: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    title: "Alice Builds Deep Dive",
    description: "Presenting sponsor on the next long-form research video.",
    minimumBid: 5000,
    avgViews: "210K",
    tags: ["Research", "Education"],
    startHoursAgo: 40,
    endHoursFromNow: 2,
    createdBy: "HUMAN",
    bids: [
      { bidderWallet: "0xB1d0000000000000000000000000000000a003", bidderName: "Coinbase", bidderAvatarUrl: BRAND_MARKS.coinbase, amount: 4200 },
    ],
  },
  {
    hostAddress: "0x2e5b3b1a0c9d4f6e8a7c1b2d3e4f5a6b7c8d9e0f",
    title: "Marco Frames Reel Placement",
    description: "Sponsored reel across the weekly design drop.",
    minimumBid: 1200,
    avgViews: "180K",
    tags: ["Design", "Video"],
    startHoursAgo: 30,
    endHoursFromNow: 5,
    createdBy: "HUMAN",
    bids: [
      { bidderWallet: "0xB1d0000000000000000000000000000000a004", bidderName: "Phantom", bidderAvatarUrl: BRAND_MARKS.phantom, amount: 3250 },
    ],
  },
  {
    hostAddress: "0x2e5b3b1a0c9d4f6e8a7c1b2d3e4f5a6b7c8d9e0f",
    title: "Marco Frames Story Takeover",
    description: "24-hour story takeover across Instagram and TikTok.",
    minimumBid: 1200,
    avgViews: "260K",
    tags: ["Design", "Video"],
    startHoursAgo: 6,
    endHoursFromNow: 64,
    createdBy: "HUMAN",
    bids: [
      { bidderWallet: "0xB1d0000000000000000000000000000000a005", bidderName: "Jupiter", bidderAvatarUrl: BRAND_MARKS.jupiter, amount: 3500 },
    ],
  },
  {
    hostAddress: "0x9a1b2c3d4e5f60718293a4b5c6d7e8f901234567",
    title: "Priya Codes Livestream Integration",
    description: "60-second mid-roll on the next livestream.",
    minimumBid: 900,
    avgViews: "95K",
    tags: ["Dev", "Education"],
    startHoursAgo: 12,
    endHoursFromNow: 1,
    createdBy: "BOT",
    bids: [
      { bidderWallet: "0xB1d0000000000000000000000000000000a006", bidderName: "Uniswap", bidderAvatarUrl: BRAND_MARKS.uniswap, amount: 1750 },
    ],
  },
  {
    hostAddress: "0x9a1b2c3d4e5f60718293a4b5c6d7e8f901234567",
    title: "Priya Codes Newsletter Feature",
    description: "Lead sponsor placement in the Monday send.",
    minimumBid: 1000,
    avgViews: "60K",
    tags: ["Dev", "Newsletter"],
    startHoursAgo: 18,
    endHoursFromNow: 28,
    createdBy: "HUMAN",
    bids: [],
  },
  {
    hostAddress: "0xf06207e32365a4f574fd4dfbe9db5be70002b2a4",
    title: "Late Night Onchain — Live Show Sponsorship",
    description: "Presenting sponsor on the M–Thu noon PST live stream, plus a pinned mention.",
    minimumBid: 8000,
    avgViews: "1.2M",
    tags: ["Crypto", "Base", "Live Streaming"],
    startHoursAgo: 48,
    endHoursFromNow: 72,
    createdBy: "HUMAN",
    featured: true,
    bids: [
      { bidderWallet: "0xB1d0000000000000000000000000000000a007", bidderName: "Base", bidderAvatarUrl: BRAND_MARKS.base, amount: 21000 },
      { bidderWallet: "0xB1d0000000000000000000000000000000a008", bidderName: "Coinbase", bidderAvatarUrl: BRAND_MARKS.coinbase, amount: 17500 },
    ],
  },
];

type SeedBooking = {
  creatorAddress: string;
  brand: string;
  markUrl: string;
  amount: number;
  placement: string;
  status: "CONFIRMED" | "PENDING";
};

const SEED_BOOKINGS: SeedBooking[] = [
  {
    creatorAddress: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    brand: "Base",
    markUrl: BRAND_MARKS.base,
    amount: 6000,
    placement: "Campaign",
    status: "CONFIRMED",
  },
  {
    creatorAddress: "0x2e5b3b1a0c9d4f6e8a7c1b2d3e4f5a6b7c8d9e0f",
    brand: "Robinhood",
    markUrl: BRAND_MARKS.robinhood,
    amount: 3500,
    placement: "X Post + Newsletter",
    status: "CONFIRMED",
  },
  {
    creatorAddress: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    brand: "Coinbase",
    markUrl: BRAND_MARKS.coinbase,
    amount: 4000,
    placement: "YouTube Integration",
    status: "CONFIRMED",
  },
  {
    creatorAddress: "0x9a1b2c3d4e5f60718293a4b5c6d7e8f901234567",
    brand: "Phantom",
    markUrl: BRAND_MARKS.phantom,
    amount: 2500,
    placement: "Reel Sponsor",
    status: "CONFIRMED",
  },
  {
    creatorAddress: "0x2e5b3b1a0c9d4f6e8a7c1b2d3e4f5a6b7c8d9e0f",
    brand: "Jupiter",
    markUrl: BRAND_MARKS.jupiter,
    amount: 1750,
    placement: "Newsletter Feature",
    status: "PENDING",
  },
  {
    creatorAddress: "0xf06207e32365a4f574fd4dfbe9db5be70002b2a4",
    brand: "Base",
    markUrl: BRAND_MARKS.base,
    amount: 8000,
    placement: "Live Show Sponsorship",
    status: "CONFIRMED",
  },
];

const ALICE = "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063";
const MARCO = "0x2e5b3b1a0c9d4f6e8a7c1b2d3e4f5a6b7c8d9e0f";
const PRIYA = "0x9a1b2c3d4e5f60718293a4b5c6d7e8f901234567";
const BILL = "0xf06207e32365a4f574fd4dfbe9db5be70002b2a4";

/** Fixed-price media inventory — bought outright, no bidding. */
const SEED_LISTINGS = [
  {
    creatorAddress: BILL,
    title: "Live show mid-roll read",
    description: "60-second host-read spot during the M–Thu noon PST stream.",
    placement: "Livestream mid-roll",
    platform: "TWITTER" as SocialPlatform,
    price: 3500,
    turnaroundDays: 5,
    slotsAvailable: 4,
  },
  {
    creatorAddress: BILL,
    title: "Pinned post + quote",
    description: "Pinned announcement post held for 24 hours, plus one quote repost.",
    placement: "Pinned post",
    platform: "TWITTER" as SocialPlatform,
    price: 1200,
    turnaroundDays: 2,
    slotsAvailable: 8,
  },
  {
    creatorAddress: ALICE,
    title: "Long-form video integration",
    description: "90-second integrated segment inside the next research video.",
    placement: "YouTube integration",
    platform: "YOUTUBE" as SocialPlatform,
    price: 6000,
    turnaroundDays: 14,
    slotsAvailable: 2,
  },
  {
    creatorAddress: ALICE,
    title: "Newsletter lead sponsor",
    description: "Top-of-send placement with logo, blurb and link.",
    placement: "Newsletter",
    platform: "TWITTER" as SocialPlatform,
    price: 1800,
    turnaroundDays: 7,
    slotsAvailable: 3,
  },
  {
    creatorAddress: MARCO,
    title: "Sponsored reel",
    description: "Fully produced 30-second vertical reel, brand-approved before posting.",
    placement: "Instagram reel",
    platform: "INSTAGRAM" as SocialPlatform,
    price: 2400,
    turnaroundDays: 10,
    slotsAvailable: 5,
  },
  {
    creatorAddress: MARCO,
    title: "TikTok series slot",
    description: "Three-part sponsored series across one week.",
    placement: "TikTok series",
    platform: "TIKTOK" as SocialPlatform,
    price: 4200,
    turnaroundDays: 12,
    slotsAvailable: 2,
  },
  {
    creatorAddress: PRIYA,
    title: "Tutorial integration",
    description: "Tool featured end-to-end in a build-along tutorial.",
    placement: "YouTube tutorial",
    platform: "YOUTUBE" as SocialPlatform,
    price: 2200,
    turnaroundDays: 14,
    slotsAvailable: 3,
  },
  {
    creatorAddress: PRIYA,
    title: "Dev thread feature",
    description: "Technical breakdown thread with your product as the worked example.",
    placement: "Thread",
    platform: "TWITTER" as SocialPlatform,
    price: 900,
    turnaroundDays: 4,
    slotsAvailable: 6,
  },
];

const SEED_CAMPAIGNS = [
  {
    name: "Robinhood Crypto",
    brandName: "Robinhood",
    budget: 15000,
    lookingFor: "YouTube + TikTok Creators",
    brief:
      "Introduce crypto trading to first-time investors. Looking for explainer-style creators who can make custody and fees feel simple.",
    platforms: ["YOUTUBE", "TIKTOK"],
    minReach: 50000,
    status: "OPEN" as const,
    markUrl: BRAND_MARKS.robinhood,
  },
  {
    name: "Base Builder Season",
    brandName: "Base",
    budget: 24000,
    lookingFor: "Onchain + developer creators",
    brief:
      "Spotlight builders shipping on Base. Prefer creators with a live audience and hands-on technical credibility.",
    platforms: ["TWITTER", "YOUTUBE"],
    minReach: 15000,
    status: "OPEN" as const,
    markUrl: BRAND_MARKS.base,
  },
  {
    name: "Phantom Wallet Launch",
    brandName: "Phantom",
    budget: 9000,
    lookingFor: "Short-form video creators",
    brief: "Drive installs for the multichain wallet update. Vertical video only.",
    platforms: ["TIKTOK", "INSTAGRAM"],
    minReach: 80000,
    status: "IN_REVIEW" as const,
    markUrl: BRAND_MARKS.phantom,
  },
];

/**
 * Activate — brand/community activations. Each carries a Vault (its reward
 * pool), which Pantheon backs; Vaults are surfaced inside an activation
 * rather than as a standalone destination.
 */
const SEED_ACTIVATIONS = [
  {
    name: "Base Builder Quests",
    description:
      "Community completes onchain quests during Builder Season. Rewards stream from the activation vault as quests are verified.",
    brandName: "Base",
    brandMarkUrl: BRAND_MARKS.base,
    status: "LIVE" as const,
    participantCount: 1284,
    endHoursFromNow: 240,
    vault: { name: "Builder Season Vault", totalRewards: 25000, distributed: 8400 },
  },
  {
    name: "Late Night Listener Rewards",
    description:
      "Live-show viewers earn from the vault for attending streams and sharing clips.",
    brandName: "Late Night Onchain",
    brandMarkUrl:
      "https://pbs.twimg.com/profile_images/2040941671605731328/ll5bSeLt_400x400.jpg",
    status: "LIVE" as const,
    participantCount: 476,
    endHoursFromNow: 96,
    vault: { name: "Listener Vault", totalRewards: 8000, distributed: 2150 },
  },
  {
    name: "Jupiter Trading Cup",
    description: "Community trading competition with a tiered payout at the close.",
    brandName: "Jupiter",
    brandMarkUrl: BRAND_MARKS.jupiter,
    status: "UPCOMING" as const,
    participantCount: 0,
    endHoursFromNow: 720,
    vault: { name: "Trading Cup Vault", totalRewards: 12000, distributed: 0 },
  },
];

/** Creator Studio — audience-and-revenue economics, deliberately no price data. */
const SEED_TOKENS = [
  {
    creatorAddress: BILL,
    symbol: "LNOC",
    name: "Late Night Onchain",
    holders: 3142,
    supply: 1_000_000,
    revenueSharePct: 15,
  },
  {
    creatorAddress: ALICE,
    symbol: "ALICE",
    name: "Alice Builds",
    holders: 842,
    supply: 500_000,
    revenueSharePct: 10,
  },
  {
    creatorAddress: MARCO,
    symbol: "FRAMES",
    name: "Marco Frames",
    holders: 1276,
    supply: 750_000,
    revenueSharePct: 12.5,
  },
];

async function main() {
  for (const seed of SEED_USERS) {
    const existing = await prisma.wallet.findUnique({ where: { address: seed.address } });
    if (existing) {
      console.log(`skip ${seed.address} (already seeded)`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        wallets: {
          create: { address: seed.address, chainId: seed.chainId, isPrimary: true },
        },
        socials: {
          create: seed.socials.map((s) => ({
            platform: s.platform,
            platformUserId: s.platformUserId,
            username: s.username,
            displayName: s.displayName,
            avatarUrl: s.avatarUrl,
            followerCount: s.followerCount,
            followerCountSyncedAt: new Date(Date.now() - 2 * HOUR),
            accessTokenEncrypted: encrypt(
              `demo-access-${s.platform.toLowerCase()}-${s.platformUserId}`,
            ),
            refreshTokenEncrypted: encrypt(
              `demo-refresh-${s.platform.toLowerCase()}-${s.platformUserId}`,
            ),
            tokenExpiresAt: new Date(Date.now() + 30 * 24 * HOUR),
            scopes: "demo",
          })),
        },
      },
    });

    console.log(`seeded user ${user.id} (${seed.address})`);
  }

  await seedMarketplace();
}

async function seedMarketplace() {
  const wallets = await prisma.wallet.findMany({
    where: { address: { in: SEED_USERS.map((s) => s.address) } },
  });
  const userIdByAddress = new Map(wallets.map((w) => [w.address, w.userId]));

  const profileIdByAddress = new Map<string, string>();
  for (const seed of SEED_USERS) {
    const userId = userIdByAddress.get(seed.address);
    if (!userId) continue;

    const profile = await prisma.creatorProfile.upsert({
      where: { userId },
      create: { userId, ...seed.profile },
      update: {},
    });
    profileIdByAddress.set(seed.address, profile.id);
  }

  for (const auction of SEED_AUCTIONS) {
    const hostId = profileIdByAddress.get(auction.hostAddress);
    if (!hostId) continue;

    const existingAuction = await prisma.auction.findFirst({
      where: { title: auction.title, hostId },
    });
    if (existingAuction) {
      console.log(`skip auction "${auction.title}" (already seeded)`);
      continue;
    }

    const created = await prisma.auction.create({
      data: {
        title: auction.title,
        description: auction.description,
        minimumBid: auction.minimumBid,
        avgViews: auction.avgViews,
        tags: auction.tags,
        startDate: hoursAgo(auction.startHoursAgo),
        endDate: hoursFromNow(auction.endHoursFromNow),
        createdBy: auction.createdBy,
        featured: auction.featured ?? false,
        hostId,
        bids: {
          create: auction.bids.map((bid) => ({
            amount: bid.amount,
            bidderWallet: bid.bidderWallet,
            bidderName: bid.bidderName,
            bidderAvatarUrl: bid.bidderAvatarUrl,
          })),
        },
      },
    });
    console.log(`seeded auction ${created.id} (${auction.title})`);
  }

  for (const booking of SEED_BOOKINGS) {
    const creatorId = profileIdByAddress.get(booking.creatorAddress);
    if (!creatorId) continue;

    const existingBooking = await prisma.booking.findFirst({
      where: { creatorId, brand: booking.brand, placement: booking.placement },
    });
    if (existingBooking) {
      // Keep brand marks current so a swapped logo reaches already-seeded rows.
      if (existingBooking.markUrl !== booking.markUrl) {
        await prisma.booking.update({
          where: { id: existingBooking.id },
          data: { markUrl: booking.markUrl },
        });
      }
      continue;
    }

    await prisma.booking.create({
      data: {
        brand: booking.brand,
        markUrl: booking.markUrl,
        amount: booking.amount,
        placement: booking.placement,
        status: booking.status,
        creatorId,
      },
    });
  }
  console.log("bookings up to date");

  for (const campaign of SEED_CAMPAIGNS) {
    const existing = await prisma.campaign.findFirst({ where: { name: campaign.name } });
    if (existing) {
      await prisma.campaign.update({ where: { id: existing.id }, data: campaign });
    } else {
      await prisma.campaign.create({ data: campaign });
    }
  }
  console.log("campaigns up to date");

  await seedListings(profileIdByAddress);
  await seedActivations();
  await seedCreatorTokens(profileIdByAddress);
}

async function seedListings(profileIdByAddress: Map<string, string>) {
  for (const listing of SEED_LISTINGS) {
    const creatorId = profileIdByAddress.get(listing.creatorAddress);
    if (!creatorId) continue;

    const existing = await prisma.listing.findFirst({
      where: { creatorId, title: listing.title },
    });
    if (existing) continue;

    const { creatorAddress: _ignored, ...data } = listing;
    await prisma.listing.create({ data: { ...data, creatorId } });
  }
  console.log("listings up to date");
}

async function seedActivations() {
  for (const activation of SEED_ACTIVATIONS) {
    const existing = await prisma.activation.findFirst({
      where: { name: activation.name },
    });
    if (existing) continue;

    const { vault, endHoursFromNow, ...data } = activation;
    await prisma.activation.create({
      data: {
        ...data,
        endDate: endHoursFromNow ? hoursFromNow(endHoursFromNow) : null,
        vault: { create: vault },
      },
    });
  }
  console.log("activations up to date");
}

async function seedCreatorTokens(profileIdByAddress: Map<string, string>) {
  for (const token of SEED_TOKENS) {
    const creatorId = profileIdByAddress.get(token.creatorAddress);
    if (!creatorId) continue;

    const existing = await prisma.creatorToken.findUnique({ where: { creatorId } });
    if (existing) continue;

    const { creatorAddress: _ignored, ...data } = token;
    await prisma.creatorToken.create({ data: { ...data, creatorId } });
  }
  console.log("creator tokens up to date");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
