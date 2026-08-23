/**
 * DEMO FIXTURES
 * =============
 * Fake data for design review. The shapes here deliberately mirror what the
 * real APIs return, so swapping a component from fixture to live data means
 * changing only where the data comes from — never the component itself.
 *
 * ⚠️  PLACEHOLDER CONTENT — REPLACE BEFORE ANYTHING SHIPS PUBLICLY.
 * The creator and brand names below are real, recognisable crypto-media
 * accounts, used purely so the layout is judged with realistic-looking
 * copy. Every figure attached to them — reach, engagement, revenue, bids,
 * bookings — is invented, and none of these accounts has any association
 * with this product. Do not publish, screenshot externally, or ship this
 * data as if it described real performance or real partnerships.
 *
 * Source of truth for each shape lives in `utils/types.ts`.
 */

// ── Types ─────────────────────────────────────────────────────────────
// The domain shapes live in `utils/types.ts`; these aliases keep the older
// Demo* names working for anything that already imports them.

import type {
  Auction,
  Booking,
  Campaign,
  Earner,
  Host,
  PlatformAnalytics,
  RecentBid,
  Viewer,
} from "@/utils/types";

export type DemoAuction = Auction;
export type DemoHost = Host;
export type DemoBid = RecentBid;
export type DemoEarner = Earner;
export type DemoStats = PlatformAnalytics;
export type DemoBooking = Booking;
export type DemoNewCampaign = Campaign;
export type DemoViewer = Viewer;

// ── Helpers ───────────────────────────────────────────────────────────

const hoursFromNow = (h: number) =>
  new Date(Date.now() + h * 3_600_000).toISOString();
const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3_600_000).toISOString();

/**
 * REAL AVATARS
 * ------------
 * `twitterAvatar` resolves an X handle to that account's live profile image
 * via unavatar.io. This keeps third-party brand marks out of the repo — no
 * copyrighted image files are committed — while still showing the real logo.
 *
 * Trade-offs to know about:
 *   • it is a third-party service, so it can rate-limit or go down; `Avatar`
 *     falls back to a generated monogram whenever a fetch fails
 *   • images are hotlinked and change when the account changes its picture
 *   • fine for a demo. For production, have creators upload their own image
 *     on signup (the Twitter OAuth flow already returns one) rather than
 *     depending on a scraper.
 *
 * To pin a logo locally instead, drop the file in `public/logos/` and set
 * the account's `pfp_url` to that path.
 */
const twitterAvatar = (handle: string) =>
  `https://unavatar.io/x/${handle}`;

/** Alias kept so brand marks read clearly at their call sites. */
const mark = twitterAvatar;
const avatar = twitterAvatar;

// ── The signed-in demo viewer ─────────────────────────────────────────

export const DEMO_VIEWER: Viewer = {
  _id: "demo-viewer",
  wallet: "0xD3m0000000000000000000000000000000000001",
  username: "bill",
  display_name: "Bill",
  socialId: "demo-social-bill",
  pfp_url: undefined,
  role: "House Founder",
  level: 7,
  currentSeasonXP: 4820,
  totalXP: 18240,
  xpToNextLevel: 7500,
};

// ── Platform stats (mirrors /api/analytics) ───────────────────────────

export const DEMO_STATS: PlatformAnalytics = {
  totalAuctions: 186,
  auctionsWithBids: 142,
  totalEarnings: 248_400,
  uniqueBidders: 1_240,
};

// ── Creators ──────────────────────────────────────────────────────────

const hosts: Record<string, Host> = {
  coinBureau: {
    _id: "host-coin-bureau",
    wallet: "0xA1b2000000000000000000000000000000000001",
    username: "coinbureau",
    display_name: "Coin Bureau",
    socialId: "social-coin-bureau",
    pfp_url: twitterAvatar("coinbureau"),
    verified: true,
    averageRating: 4.9,
    totalReviews: 64,
  },
  altcoinDaily: {
    _id: "host-altcoin-daily",
    wallet: "0xA1b2000000000000000000000000000000000002",
    username: "altcoindaily",
    display_name: "Altcoin Daily",
    socialId: "social-altcoin-daily",
    pfp_url: twitterAvatar("AltcoinDailyio"),
    verified: true,
    averageRating: 4.7,
    totalReviews: 41,
  },
  bankless: {
    _id: "host-bankless",
    wallet: "0xA1b2000000000000000000000000000000000003",
    username: "bankless",
    display_name: "Bankless",
    socialId: "social-bankless",
    pfp_url: twitterAvatar("BanklessHQ"),
    verified: true,
    averageRating: 4.8,
    totalReviews: 58,
  },
  cryptoWendy: {
    _id: "host-crypto-wendy",
    wallet: "0xA1b2000000000000000000000000000000000004",
    username: "CryptoWendyO",
    display_name: "Crypto Wendy O",
    socialId: "social-crypto-wendy",
    pfp_url: twitterAvatar("CryptoWendyO"),
    verified: true,
    averageRating: 4.6,
    totalReviews: 33,
  },
  investAnswers: {
    _id: "host-invest-answers",
    wallet: "0xA1b2000000000000000000000000000000000005",
    username: "investanswers",
    display_name: "InvestAnswers",
    socialId: "social-invest-answers",
    pfp_url: twitterAvatar("InvestAnswers"),
    averageRating: 4.4,
    totalReviews: 22,
  },
};

export const DEMO_HOSTS = hosts;

// ── Featured auction (drives the hero panel) ──────────────────────────

export const DEMO_FEATURED: Auction = {
  _id: "auction-featured",
  auctionName: "Coin Bureau — September Slate",
  description:
    "Presenting sponsor across the September slate — video, newsletter and X.",
  startDate: hoursAgo(72),
  endDate: hoursFromNow(50),
  currency: "USDC",
  minimumBid: 6_000,
  tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  blockchainAuctionId: "1001",
  hostedBy: hosts.coinBureau,
  highestBid: 14_500,
  imageUrl: twitterAvatar("coinbureau"),
  topBidder: {
    wallet: "0xB1d0000000000000000000000000000000000001",
    username: "base",
    socialId: "social-base",
    pfp_url: twitterAvatar("base"),
    bidAmount: 14_500,
    _id: "bidder-base",
  },
  participantCount: 6,
  hoursRemaining: 50,
  bidCount: 6,
  createdByType: "human",
  reach: [
    { platform: "youtube", value: "2.7M" },
    { platform: "x", value: "2.4M" },
    { platform: "tiktok", value: "410K" },
    { platform: "newsletter", value: "180K" },
  ],
  tags: ["Research", "Macro", "Altcoins", "Education"],
  avgViews: "640K",
  engagement: "6.8%",
  trend: [22, 26, 24, 31, 29, 35, 33, 30, 38, 36, 44, 41, 47, 45],
};

// ── Live auctions ─────────────────────────────────────────────────────

export const DEMO_AUCTIONS: Auction[] = [
  {
    _id: "auction-1",
    auctionName: "Coin Bureau Deep Dive",
    description: "Presenting sponsor on the next long-form research video.",
    startDate: hoursAgo(40),
    endDate: hoursFromNow(2),
    currency: "USDC",
    minimumBid: 5_000,
    tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    blockchainAuctionId: "1002",
    hostedBy: hosts.coinBureau,
    imageUrl: twitterAvatar("coinbureau"),
    markUrl: twitterAvatar("coinbureau"),
    highestBid: 14_500,
    topBidder: {
      wallet: "0xB1d0000000000000000000000000000000000002",
      username: "base",
      socialId: "social-base",
      pfp_url: twitterAvatar("base"),
      bidAmount: 14_500,
      _id: "bidder-1",
    },
    participantCount: 6,
    hoursRemaining: 2,
    bidCount: 6,
    createdByType: "human",
  },
  {
    _id: "auction-2",
    auctionName: "Bankless Newsletter",
    description: "Lead sponsor placement in the Monday send.",
    startDate: hoursAgo(30),
    endDate: hoursFromNow(5),
    currency: "USDC",
    minimumBid: 1_200,
    tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    blockchainAuctionId: "1003",
    hostedBy: hosts.bankless,
    imageUrl: twitterAvatar("BanklessHQ"),
    markUrl: twitterAvatar("BanklessHQ"),
    highestBid: 3_250,
    topBidder: {
      wallet: "0xB1d0000000000000000000000000000000000003",
      username: "robinhood",
      socialId: "social-robinhood",
      pfp_url: twitterAvatar("RobinhoodApp"),
      bidAmount: 3_250,
      _id: "bidder-2",
    },
    participantCount: 4,
    hoursRemaining: 5,
    bidCount: 4,
    createdByType: "human",
  },
  {
    _id: "auction-3",
    auctionName: "Altcoin Daily Integration",
    description: "60-second mid-roll on the next daily upload.",
    startDate: hoursAgo(20),
    endDate: hoursFromNow(1),
    currency: "USDC",
    minimumBid: 1_500,
    tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    blockchainAuctionId: "1004",
    hostedBy: hosts.altcoinDaily,
    imageUrl: twitterAvatar("AltcoinDailyio"),
    markUrl: twitterAvatar("AltcoinDailyio"),
    highestBid: 2_100,
    topBidder: {
      wallet: "0xB1d0000000000000000000000000000000000004",
      username: "phantom",
      socialId: "social-phantom",
      pfp_url: twitterAvatar("phantom"),
      bidAmount: 2_100,
      _id: "bidder-3",
    },
    participantCount: 3,
    hoursRemaining: 1,
    bidCount: 3,
    createdByType: "bot",
  },
  {
    _id: "auction-4",
    auctionName: "Wendy O Weekly Live",
    description: "Opening callout on the weekly market breakdown.",
    startDate: hoursAgo(18),
    endDate: hoursFromNow(2),
    currency: "USDC",
    minimumBid: 1_000,
    tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    blockchainAuctionId: "1005",
    hostedBy: hosts.cryptoWendy,
    imageUrl: twitterAvatar("CryptoWendyO"),
    markUrl: twitterAvatar("CryptoWendyO"),
    highestBid: 2_850,
    topBidder: {
      wallet: "0xB1d0000000000000000000000000000000000005",
      username: "jupiter",
      socialId: "social-jupiter",
      pfp_url: twitterAvatar("JupiterExchange"),
      bidAmount: 2_850,
      _id: "bidder-4",
    },
    participantCount: 12,
    hoursRemaining: 2,
    bidCount: 12,
    createdByType: "human",
  },
  {
    _id: "auction-5",
    auctionName: "InvestAnswers Livestream",
    description: "Opening callout on the Friday livestream.",
    startDate: hoursAgo(12),
    endDate: hoursFromNow(28),
    currency: "USDC",
    minimumBid: 900,
    tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    blockchainAuctionId: "1006",
    hostedBy: hosts.investAnswers,
    imageUrl: twitterAvatar("InvestAnswers"),
    markUrl: twitterAvatar("InvestAnswers"),
    highestBid: 1_750,
    topBidder: null,
    participantCount: 5,
    hoursRemaining: 28,
    bidCount: 5,
    createdByType: "bot",
  },
  {
    _id: "auction-6",
    auctionName: "Altcoin Daily X + Short",
    description: "Bundled placement across X and a TikTok short.",
    startDate: hoursAgo(6),
    endDate: hoursFromNow(64),
    currency: "USDC",
    minimumBid: 1_200,
    tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    blockchainAuctionId: "1007",
    hostedBy: hosts.altcoinDaily,
    imageUrl: twitterAvatar("AltcoinDailyio"),
    markUrl: twitterAvatar("AltcoinDailyio"),
    highestBid: 3_500,
    topBidder: {
      wallet: "0xB1d0000000000000000000000000000000000006",
      username: "coinbase",
      socialId: "social-coinbase",
      pfp_url: twitterAvatar("coinbase"),
      bidAmount: 3_500,
      _id: "bidder-6",
    },
    participantCount: 8,
    hoursRemaining: 64,
    bidCount: 8,
    createdByType: "human",
  },
];

/** The three rows shown in the Live Auctions panel. */
export const DEMO_LIVE_AUCTIONS = DEMO_AUCTIONS.slice(0, 3);

/** Soonest-ending auction, used by the Ending Soon spotlight card. */
export const DEMO_ENDING_SOON = DEMO_AUCTIONS[2];

// ── Creators / earners (mirrors /api/leaderboard/top-revenue) ─────────

export const DEMO_EARNERS: Earner[] = [
  {
    _id: hosts.coinBureau._id,
    totalRevenue: 24_100,
    auctionCount: 8,
    wallet: hosts.coinBureau.wallet,
    username: hosts.coinBureau.username,
    display_name: hosts.coinBureau.display_name,
    pfp_url: hosts.coinBureau.pfp_url,
    socialId: hosts.coinBureau.socialId,
    verified: true,
    reach: "2.7M",
    engagement: "6.8%",
    inventory: 8,
    fromPrice: 6_000,
    platforms: ["youtube", "x", "tiktok", "newsletter"],
    tags: ["Research", "Macro", "Education"],
    trend: [30, 34, 32, 40, 38, 46, 44, 52],
  },
  {
    _id: hosts.altcoinDaily._id,
    totalRevenue: 18_600,
    auctionCount: 6,
    wallet: hosts.altcoinDaily.wallet,
    username: hosts.altcoinDaily.username,
    display_name: hosts.altcoinDaily.display_name,
    pfp_url: hosts.altcoinDaily.pfp_url,
    socialId: hosts.altcoinDaily.socialId,
    verified: true,
    reach: "1.4M",
    engagement: "7.2%",
    inventory: 6,
    fromPrice: 3_200,
    platforms: ["youtube", "x", "tiktok"],
    tags: ["Altcoins", "News", "Markets"],
    trend: [18, 22, 20, 27, 25, 33, 38, 44],
  },
  {
    _id: hosts.bankless._id,
    totalRevenue: 12_200,
    auctionCount: 5,
    wallet: hosts.bankless.wallet,
    username: hosts.bankless.username,
    display_name: hosts.bankless.display_name,
    pfp_url: hosts.bankless.pfp_url,
    socialId: hosts.bankless.socialId,
    verified: true,
    reach: "980K",
    engagement: "5.1%",
    inventory: 5,
    fromPrice: 2_400,
    platforms: ["youtube", "podcast", "newsletter", "x"],
    tags: ["DeFi", "Ethereum", "Research"],
    trend: [26, 24, 29, 27, 32, 30, 36, 34],
  },
  {
    _id: hosts.cryptoWendy._id,
    totalRevenue: 9_800,
    auctionCount: 7,
    wallet: hosts.cryptoWendy.wallet,
    username: hosts.cryptoWendy.username,
    display_name: hosts.cryptoWendy.display_name,
    pfp_url: hosts.cryptoWendy.pfp_url,
    socialId: hosts.cryptoWendy.socialId,
    verified: true,
    reach: "820K",
    engagement: "4.3%",
    inventory: 7,
    fromPrice: 2_000,
    platforms: ["youtube", "x", "podcast"],
    tags: ["Data", "Cycles", "Macro"],
    trend: [20, 23, 21, 25, 24, 28, 26, 31],
  },
  {
    _id: hosts.investAnswers._id,
    totalRevenue: 7_400,
    auctionCount: 4,
    wallet: hosts.investAnswers.wallet,
    username: hosts.investAnswers.username,
    display_name: hosts.investAnswers.display_name,
    pfp_url: hosts.investAnswers.pfp_url,
    socialId: hosts.investAnswers.socialId,
    reach: "450K",
    engagement: "6.0%",
    inventory: 4,
    fromPrice: 1_000,
    platforms: ["youtube", "x", "podcast"],
    tags: ["Markets", "Bitcoin", "Macro"],
    trend: [14, 17, 16, 20, 19, 24, 22, 27],
  },
];

// ── Recent bids (mirrors /api/leaderboard/recent-bids) ────────────────

export const DEMO_RECENT_BIDS: RecentBid[] = [
  {
    _id: "bid-1",
    bidderName: "Base",
    bidderPfp: twitterAvatar("base"),
    bidderWallet: "0xB1d0000000000000000000000000000000000001",
    socialId: "social-base",
    auctionName: "Coin Bureau Deep Dive",
    blockchainAuctionId: "1002",
    bidAmount: 14_500,
    usdcValue: 14_500,
    currency: "USDC",
    bidTimestamp: hoursAgo(0.4),
    source: "human",
  },
  {
    _id: "bid-2",
    bidderName: "Robinhood",
    bidderPfp: twitterAvatar("RobinhoodApp"),
    bidderWallet: "0xB1d0000000000000000000000000000000000003",
    socialId: "social-robinhood",
    auctionName: "Bankless Newsletter",
    blockchainAuctionId: "1003",
    bidAmount: 3_250,
    usdcValue: 3_250,
    currency: "USDC",
    bidTimestamp: hoursAgo(1.2),
    source: "human",
  },
  {
    _id: "bid-3",
    bidderName: "Phantom",
    bidderPfp: twitterAvatar("phantom"),
    bidderWallet: "0xB1d0000000000000000000000000000000000004",
    socialId: "social-phantom",
    auctionName: "Altcoin Daily Integration",
    blockchainAuctionId: "1004",
    bidAmount: 2_100,
    usdcValue: 2_100,
    currency: "USDC",
    bidTimestamp: hoursAgo(2.5),
    source: "bot",
  },
  {
    _id: "bid-4",
    bidderName: "Jupiter",
    bidderPfp: twitterAvatar("JupiterExchange"),
    bidderWallet: "0xB1d0000000000000000000000000000000000005",
    socialId: "social-jupiter",
    auctionName: "Wendy O Weekly Live",
    blockchainAuctionId: "1005",
    bidAmount: 2_850,
    usdcValue: 2_850,
    currency: "USDC",
    bidTimestamp: hoursAgo(3.1),
    source: "human",
  },
  {
    _id: "bid-5",
    bidderName: "Coinbase",
    bidderPfp: twitterAvatar("coinbase"),
    bidderWallet: "0xB1d0000000000000000000000000000000000006",
    socialId: "social-coinbase",
    auctionName: "Altcoin Daily X + Short",
    blockchainAuctionId: "1007",
    bidAmount: 3_500,
    usdcValue: 3_500,
    currency: "USDC",
    bidTimestamp: hoursAgo(4.6),
    source: "human",
  },
];

// ── Recently booked strip ─────────────────────────────────────────────

export const DEMO_BOOKINGS: Booking[] = [
  {
    _id: "booking-1",
    brand: "Base",
    markUrl: twitterAvatar("base"),
    amount: 6_000,
    placement: "Campaign",
    creator: "Coin Bureau",
    status: "CONFIRMED",
  },
  {
    _id: "booking-2",
    brand: "Robinhood",
    markUrl: twitterAvatar("RobinhoodApp"),
    amount: 3_500,
    placement: "X Post + Newsletter",
    creator: "Bankless",
    status: "CONFIRMED",
  },
  {
    _id: "booking-3",
    brand: "Coinbase",
    markUrl: twitterAvatar("coinbase"),
    amount: 4_000,
    placement: "YouTube Integration",
    creator: "Altcoin Daily",
    status: "CONFIRMED",
  },
  {
    _id: "booking-4",
    brand: "Phantom",
    markUrl: twitterAvatar("phantom"),
    amount: 2_500,
    placement: "Livestream Sponsor",
    creator: "InvestAnswers",
    status: "CONFIRMED",
  },
  {
    _id: "booking-5",
    brand: "Jupiter",
    markUrl: twitterAvatar("JupiterExchange"),
    amount: 1_750,
    placement: "Newsletter Feature",
    creator: "Crypto Wendy O",
    status: "CONFIRMED",
  },
];

// ── Spotlight cards ───────────────────────────────────────────────────

export const DEMO_TRENDING_CREATOR = DEMO_EARNERS[1];

export const DEMO_MOST_BOOKED = {
  ...DEMO_EARNERS[2],
  bookingsThisMonth: 24,
};

export const DEMO_NEW_CAMPAIGN: Campaign = {
  _id: "campaign-1",
  name: "Robinhood Crypto",
  budget: 15_000,
  lookingFor: "YouTube + TikTok Creators",
};
