import type { ListingStatus } from "@prisma/client";
import { prisma } from "../db";
import { sendAuctionWon } from "./email";
import { getWinningProject, type SerializedDailyProject } from "./dailyProject";
import { superadminWallet } from "./roles";
import { settleExpiredAuctions } from "./auctionSettlement";
import {
  auctionHouseAbi,
  auctionHouseAddress,
  endAuctionOn,
  erc20Abi,
  feeRecipient,
  operatorAccount,
  publicClient,
  readListingOnChain,
  recordedHouse,
  walletClient,
} from "./operator";
import {
  findListingToken,
  formatTokenAmount,
  fromTokenUnits,
  LISTING_TOKENS,
  toTokenUnits,
  USDG,
  type ListingToken,
} from "./tokens";

const ZERO = "0x0000000000000000000000000000000000000000";
const DAY_MS = 24 * 3_600_000;
const ROBINHOOD_CHAIN_ID = 4663;

const creatorInclude = {
  user: { include: { socials: true, wallets: true } },
} as const;

const OPEN_DAILY = {
  isDaily: true,
  settledAt: null,
  status: { in: ["ACTIVE", "DRAFT"] as ("ACTIVE" | "DRAFT")[] },
};

export type DailyAuctionCycleResult =
  | { skipped: true; reason: "in-flight" | "no-operator" | "no-creator" }
  | {
      ok: true;
      settled: string | null;
      winner: string | null;
      spotlight: ShowcasePayload | null;
      next: string | null;
      started: boolean;
    }
  | { ok: false; error: string };

type SkipOperator = { skipped: true; reason: "no-operator" };
type CycleError = { ok: false; error: string };

type SettleExpiredResult =
  | SkipOperator
  | CycleError
  | { ok: true; settled: string; winner: string | null; spotlight: ShowcasePayload | null };

type StartDailyResult = SkipOperator | { ok: true; listing: { id: string } };

type CancelOpenResult = SkipOperator | CycleError | { ok: true; cancelled: string };

function isSkipped(result: object): result is SkipOperator {
  return "skipped" in result && (result as SkipOperator).skipped === true;
}

/** What Today's Attention renders for the 24h after settlement. */
export type ShowcasePayload = {
  listingId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  winnerWallet: string;
  winningBid: number;
  liveSince: string;
  liveUntil: string;
};

type OpenDaily = {
  id: string;
  title: string;
  description: string | null;
  category:
    | "SHOUTOUT"
    | "SPONSORED_POST"
    | "VIDEO_INTEGRATION"
    | "DEDICATED_VIDEO"
    | "LIVESTREAM"
    | "PODCAST"
    | "NEWSLETTER"
    | "AMA"
    | "COLLAB"
    | "CONSULTING"
    | "OTHER";
  price: number;
  currency: string;
  placement: string | null;
  platform: "YOUTUBE" | "TWITTER" | "INSTAGRAM" | "TIKTOK" | null;
  turnaroundDays: number | null;
  chainId: number | null;
  contractAddress: string | null;
  tokenAddress: string | null;
  tokenName: string | null;
  txHash: string | null;
  status: ListingStatus;
  endDate: Date | null;
  creatorId: string;
  bids: { bidderWallet: string; amount: number }[];
};

type DailyTemplate = {
  title: string;
  description: string | null;
  category: OpenDaily["category"];
  price: number;
  currency: string;
  placement: string | null;
  platform: OpenDaily["platform"];
  turnaroundDays: number | null;
  chainId: number | null;
  contractAddress: string | null;
  tokenAddress: string | null;
  tokenName: string | null;
  creatorId: string;
};

let running = false;

/** The reserve, in units of `dailyToken()`. */
function dailyMinBid() {
  const parsed = Number(process.env.DAILY_AUCTION_MIN_BID);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0.01;
}

/** What the daily auction is priced and bid in — USDG unless DAILY_AUCTION_TOKEN says LNOC. */
function dailyToken(): ListingToken {
  const wanted = process.env.DAILY_AUCTION_TOKEN?.trim().toUpperCase();
  return LISTING_TOKENS.find((t) => t.symbol === wanted) ?? USDG;
}

/**
 * endAuction pays the listing owner (the operator). Forward that share to
 * FEE_RECIPIENT so the treasury — not the hot operator key — holds the win.
 */
async function forwardWinningProceeds({
  house,
  token,
  rawBid,
}: {
  house: `0x${string}`;
  token: `0x${string}`;
  rawBid: bigint;
}) {
  if (rawBid <= 0n) return;
  const recipient = feeRecipient();
  const account = operatorAccount();
  const wallet = walletClient();
  const client = publicClient();
  if (!recipient || !account || !wallet) return;
  if (recipient.toLowerCase() === account.address.toLowerCase()) return;

  // Both contracts expose the same `feePercent()`, so the current ABI reads either.
  const feeBps = await client.readContract({
    address: house,
    abi: auctionHouseAbi,
    functionName: "feePercent",
  });
  const payout = rawBid - (rawBid * feeBps) / 10000n;
  if (payout <= 0n) return;

  const hash = await wallet.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, payout],
    account,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error("forward winning proceeds reverted");
  }
  const known = findListingToken(token);
  const shown = known ? formatTokenAmount(fromTokenUnits(payout, known), known.symbol) : `${payout} raw`;
  console.log(`[daily-auction] forwarded ${shown} to ${recipient} tx=${hash}`);
}

function isDue(listing: { endDate: Date | null }, now: Date) {
  return !listing.endDate || listing.endDate.getTime() <= now.getTime();
}

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}\u2026${wallet.slice(-4)}`;
}

async function emailWinner(
  listing: { id: string; title: string; currency: string },
  wallet: string,
  amount: number,
) {
  const user = await prisma.user.findFirst({
    where: {
      email: { not: null },
      emailVerifiedAt: { not: null },
      wallets: { some: { address: wallet.toLowerCase() } },
    },
    select: { email: true },
  });
  if (!user?.email) return;
  await sendAuctionWon(user.email, {
    title: listing.title,
    listingId: listing.id,
    amount,
    currency: listing.currency,
  }).catch((err) => {
    console.error("[email] auction-won failed:", err);
  });
}

/**
 * The operator-owned creator the rotating daily listing hangs off. Created
 * from SUPERADMIN_WALLET (or the operator key) the first time the cron runs,
 * so the first auction does not wait on a manual listing.
 */
async function ensureOperatorCreator() {
  const fromEnv = superadminWallet();
  const fromKey = operatorAccount()?.address.toLowerCase() ?? null;
  const address = fromEnv ?? fromKey;
  if (!address) return null;

  const existing = await prisma.wallet.findUnique({
    where: { address },
    include: { user: { include: { creatorProfile: true } } },
  });

  if (existing) {
    if (existing.user.role !== "SUPERADMIN") {
      await prisma.user.update({ where: { id: existing.user.id }, data: { role: "SUPERADMIN" } });
    }
    if (existing.user.creatorProfile) return existing.user.creatorProfile;
    return prisma.creatorProfile.create({
      data: {
        userId: existing.user.id,
        displayName: "LNOC",
        username: "lnoc",
        tags: [],
        trend: [],
      },
    });
  }

  const taken = await prisma.user.findUnique({ where: { username: "lnoc" } });
  const user = await prisma.user.create({
    data: {
      role: "SUPERADMIN",
      username: taken ? undefined : "lnoc",
      wallets: { create: { address, chainId: ROBINHOOD_CHAIN_ID, isPrimary: true } },
      creatorProfile: {
        create: { displayName: "LNOC", username: "lnoc", tags: [], trend: [] },
      },
    },
    include: { creatorProfile: true },
  });
  return user.creatorProfile;
}

function defaultTemplate(creatorId: string): DailyTemplate {
  const token = dailyToken();
  return {
    title: "24-hour attention auction",
    description: "The winning project takes the homepage billboard for a full day.",
    category: "SHOUTOUT",
    price: dailyMinBid(),
    currency: token.symbol,
    placement: "Homepage billboard",
    platform: null,
    turnaroundDays: 1,
    chainId: ROBINHOOD_CHAIN_ID,
    contractAddress: null,
    tokenAddress: token.address,
    tokenName: token.symbol,
    creatorId,
  };
}

async function findOpenDaily(): Promise<OpenDaily | null> {
  return prisma.listing.findFirst({
    where: OPEN_DAILY,
    orderBy: { endDate: "asc" },
    include: { bids: { orderBy: { amount: "desc" } } },
  });
}

/**
 * Builds the 24h showcase payload from the winner's pitch. A missing pitch
 * still produces a billboard card so a win is never silent.
 */
export function buildShowcase(
  listing: { id: string; settledAt: Date | null; winnerWallet: string | null },
  project: SerializedDailyProject | null,
  amount: number,
): ShowcasePayload | null {
  if (!listing.winnerWallet || !listing.settledAt) return null;
  return {
    listingId: listing.id,
    name: project?.name || shortWallet(listing.winnerWallet),
    description: project?.description ?? null,
    imageUrl: project?.imageUrl ?? null,
    websiteUrl: project?.websiteUrl ?? null,
    twitterUrl: project?.twitterUrl ?? null,
    youtubeUrl: project?.youtubeUrl ?? null,
    winnerWallet: listing.winnerWallet,
    winningBid: amount,
    liveSince: listing.settledAt.toISOString(),
    liveUntil: new Date(listing.settledAt.getTime() + DAY_MS).toISOString(),
  };
}

async function settleExpired(expired: OpenDaily, now: Date): Promise<SettleExpiredResult> {
  const account = operatorAccount();
  const client = publicClient();

  if (!account) {
    console.warn("[daily-auction] OPERATOR_PRIVATE_KEY unset — cannot settle");
    return { skipped: true as const, reason: "no-operator" as const };
  }

  let highestBidder = expired.bids[0]?.bidderWallet ?? "";
  let highestBid = expired.bids[0]?.amount ?? 0;

  // Settled on the contract the auction was opened on, which after a redeploy
  // is not the one new auctions start on.
  const house = recordedHouse(expired.contractAddress);
  if (house && expired.txHash) {
    try {
      const meta = await readListingOnChain(house, expired.id);
      if (meta.highestBidder && meta.highestBidder.toLowerCase() !== ZERO) {
        highestBidder = meta.highestBidder.toLowerCase();
        highestBid = meta.highestBidAmount;
      }

      if (!meta.settled) {
        const hash = await endAuctionOn(house, expired.id);
        const receipt = await client.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          throw new Error("endAuction reverted");
        }
        if (meta.payoutToken) {
          await forwardWinningProceeds({ house, token: meta.payoutToken, rawBid: meta.payoutRaw });
        }
      }
    } catch (err) {
      console.error("[daily-auction] settle failed:", err);
      return { ok: false as const, error: err instanceof Error ? err.message : "settle failed" };
    }
  }

  const hasWinner = Boolean(highestBidder && highestBidder !== ZERO && highestBid > 0);
  const settled = await prisma.listing.update({
    where: { id: expired.id },
    data: {
      settledAt: now,
      winnerWallet: hasWinner ? highestBidder : null,
      status: hasWinner ? "SOLD" : "CANCELLED",
      slotsAvailable: 0,
    },
  });

  let spotlight: ShowcasePayload | null = null;
  if (hasWinner) {
    const project = await getWinningProject(expired.id, highestBidder);
    if (!project) {
      console.warn(`[daily-auction] ${expired.id} won by ${highestBidder} with no project pitch`);
    }
    spotlight = buildShowcase(settled, project, highestBid);
    if (spotlight) {
      console.log(
        `[daily-auction] showcase ${spotlight.name} live until ${spotlight.liveUntil}`,
      );
    }
    await emailWinner(expired, highestBidder, highestBid);
  }

  console.log(
    `[daily-auction] settled ${expired.id} winner=${hasWinner ? highestBidder : "none"}`,
  );
  return { ok: true as const, settled: expired.id, winner: hasWinner ? highestBidder : null, spotlight };
}

async function startDailyAuction(template: DailyTemplate): Promise<StartDailyResult> {
  const account = operatorAccount();
  const wallet = walletClient();
  const client = publicClient();
  const house = auctionHouseAddress();
  if (!account || !wallet) {
    console.warn("[daily-auction] OPERATOR_PRIVATE_KEY unset — cannot start");
    return { skipped: true as const, reason: "no-operator" as const };
  }

  const nextId = crypto.randomUUID();
  const endDate = new Date(Date.now() + DAY_MS);
  const token = findListingToken(template.tokenAddress) ?? USDG;

  const hash = await wallet.writeContract({
    address: house,
    abi: auctionHouseAbi,
    functionName: "startAuction",
    args: [nextId, token.address, 24n, toTokenUnits(template.price, token)],
    account,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error("startAuction reverted");
  }

  const listing = await prisma.listing.create({
    data: {
      id: nextId,
      title: template.title,
      description: template.description,
      category: template.category,
      pricingType: "AUCTION",
      price: template.price,
      currency: token.symbol,
      placement: template.placement,
      platform: template.platform,
      turnaroundDays: template.turnaroundDays,
      slotsAvailable: 1,
      endDate,
      status: "ACTIVE",
      isDaily: true,
      chainId: template.chainId ?? ROBINHOOD_CHAIN_ID,
      // Always the contract this was just written to — a template inherited
      // from yesterday may name a contract that has since been replaced.
      contractAddress: house,
      tokenAddress: token.address,
      tokenName: token.symbol,
      txHash: hash,
      creatorId: template.creatorId,
    },
  });

  console.log(
    `[daily-auction] started ${listing.id} reserve=${formatTokenAmount(template.price, token.symbol)} ends ${endDate.toISOString()}`,
  );
  return { ok: true as const, listing };
}

/** Ends the live daily auction on-chain with no winner so a replacement can start. */
async function cancelOpenDaily(open: OpenDaily): Promise<CancelOpenResult> {
  if (!operatorAccount()) {
    return { skipped: true as const, reason: "no-operator" as const };
  }

  const house = recordedHouse(open.contractAddress);
  if (house && open.txHash) {
    try {
      const meta = await readListingOnChain(house, open.id);
      if (!meta.settled) {
        const hash = await endAuctionOn(house, open.id);
        const receipt = await publicClient().waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          throw new Error("endAuction reverted");
        }
      }
    } catch (err) {
      console.error("[daily-auction] cancel failed:", err);
      return { ok: false as const, error: err instanceof Error ? err.message : "cancel failed" };
    }
  }

  await prisma.listing.update({
    where: { id: open.id },
    data: {
      settledAt: new Date(),
      winnerWallet: null,
      status: "CANCELLED",
      slotsAvailable: 0,
    },
  });
  console.log(`[daily-auction] cancelled ${open.id}`);
  return { ok: true as const, cancelled: open.id };
}

/**
 * Drops the live daily auction (no winner) and opens a new one at the
 * configured reserve. Used when the reserve price changes.
 */
export async function replaceOpenDailyAuction(): Promise<DailyAuctionCycleResult> {
  if (running) return { skipped: true, reason: "in-flight" };
  running = true;
  try {
    const open = await findOpenDaily();
    if (open) {
      const cancelled = await cancelOpenDaily(open);
      if (isSkipped(cancelled)) return cancelled;
      if (!cancelled.ok) return cancelled;
    }

    const creator = await ensureOperatorCreator();
    if (!creator) return { skipped: true, reason: "no-creator" };

    const started = await startDailyAuction(defaultTemplate(creator.id));
    if (isSkipped(started)) return started;
    return {
      ok: true,
      settled: open?.id ?? null,
      winner: null,
      spotlight: null,
      next: started.listing.id,
      started: true,
    };
  } catch (err) {
    console.error("[daily-auction] replace failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "replace failed" };
  } finally {
    running = false;
  }
}

/**
 * Daily auction cron:
 * 1. End any expired daily auction and declare the winner
 * 2. Put the winner's project (name, description, image, socials) on the
 *    homepage showcase for 24 hours
 * 3. Start the next 24-hour auction — including the very first one
 */
export async function settleAndRolloverDailyAuction(): Promise<DailyAuctionCycleResult> {
  if (running) return { skipped: true, reason: "in-flight" };
  running = true;
  try {
    return await runDailyCycle();
  } finally {
    running = false;
  }
}

async function runDailyCycle(): Promise<DailyAuctionCycleResult> {
  const now = new Date();
  let settled: string | null = null;
  let winner: string | null = null;
  let spotlight: ShowcasePayload | null = null;
  let previous: DailyTemplate | null = null;

  let open = await findOpenDaily();
  while (open && isDue(open, now)) {
    const result = await settleExpired(open, now);
    if (isSkipped(result)) return result;
    if (!result.ok) return result;
    settled = result.settled;
    winner = result.winner;
    spotlight = result.spotlight;
    previous = {
      title: open.title,
      description: open.description,
      category: open.category,
      price: open.price,
      currency: open.currency,
      placement: open.placement,
      platform: open.platform,
      turnaroundDays: open.turnaroundDays,
      chainId: open.chainId,
      contractAddress: open.contractAddress,
      tokenAddress: open.tokenAddress,
      tokenName: open.tokenName,
      creatorId: open.creatorId,
    };
    open = await findOpenDaily();
  }

  if (open) {
    if (open.status === "DRAFT") {
      await prisma.listing.update({ where: { id: open.id }, data: { status: "ACTIVE" } });
    }
    return { ok: true, settled, winner, spotlight, next: open.id, started: false };
  }

  const creator = await ensureOperatorCreator();
  if (!creator) {
    console.warn("[daily-auction] no SUPERADMIN wallet — cannot start a daily auction");
    return { skipped: true, reason: "no-creator" };
  }

  const template = previous ?? defaultTemplate(creator.id);
  template.creatorId = previous?.creatorId ?? creator.id;
  // Always take the live env reserve and token — do not inherit yesterday's.
  template.price = dailyMinBid();
  template.tokenAddress = dailyToken().address;
  template.tokenName = dailyToken().symbol;
  template.currency = dailyToken().symbol;

  try {
    const started = await startDailyAuction(template);
    if (isSkipped(started)) return started;
    return {
      ok: true,
      settled,
      winner,
      spotlight,
      next: started.listing.id,
      started: true,
    };
  } catch (err) {
    console.error("[daily-auction] start failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "start failed" };
  }
}

/**
 * Runs the daily rollover and the ordinary-auction sweep every minute. The two
 * are independent: a seller's auction expiring must not wait on the daily
 * cycle, and a failure in either one must not stop the other.
 */
export function startDailyAuctionTicker() {
  const ms = 60_000;
  const tick = () => {
    void settleAndRolloverDailyAuction().catch((err) => {
      console.error("[daily-auction] ticker error:", err);
    });
    void settleExpiredAuctions().catch((err) => {
      console.error("[auction-settle] ticker error:", err);
    });
  };
  tick();
  return setInterval(tick, ms);
}
