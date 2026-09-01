import { prisma } from "../db";
import { sendAuctionWon } from "./email";
import {
  auctionHouseAbi,
  auctionHouseAddress,
  fromTokenAmount,
  operatorAccount,
  publicClient,
  toTokenAmount,
  walletClient,
} from "./operator";

const ZERO = "0x0000000000000000000000000000000000000000";
const creatorInclude = {
  user: { include: { socials: true, wallets: true } },
} as const;

let running = false;

async function emailWinner(listingId: string, title: string, wallet: string, amount: number) {
  const user = await prisma.user.findFirst({
    where: {
      email: { not: null },
      emailVerifiedAt: { not: null },
      wallets: { some: { address: wallet.toLowerCase() } },
    },
    select: { email: true },
  });
  if (!user?.email) return;
  await sendAuctionWon(user.email, { title, listingId, amount }).catch((err) => {
    console.error("[email] auction-won failed:", err);
  });
}

export async function settleAndRolloverDailyAuction() {
  if (running) return { skipped: true as const, reason: "in-flight" };
  running = true;
  try {
    return await runRollover();
  } finally {
    running = false;
  }
}

async function runRollover() {
  const now = new Date();
  const expired = await prisma.listing.findFirst({
    where: {
      isDaily: true,
      settledAt: null,
      endDate: { lte: now },
      status: { in: ["ACTIVE", "DRAFT"] },
    },
    orderBy: { endDate: "asc" },
    include: { creator: { include: creatorInclude }, bids: { orderBy: { amount: "desc" } } },
  });

  if (!expired) return { skipped: true as const, reason: "none-due" };

  const account = operatorAccount();
  const wallet = walletClient();
  const client = publicClient();
  const house = auctionHouseAddress();

  if (!account || !wallet) {
    console.warn("[daily-auction] OPERATOR_PRIVATE_KEY unset — cannot settle");
    return { skipped: true as const, reason: "no-operator" };
  }

  let highestBidder = expired.bids[0]?.bidderWallet ?? "";
  let highestBid = expired.bids[0]?.amount ?? 0;
  let alreadySettled = false;

  if (expired.contractAddress && expired.txHash) {
    try {
      const listingType = await client.readContract({
        address: house,
        abi: auctionHouseAbi,
        functionName: "getListingType",
        args: [expired.id],
      });
      alreadySettled = listingType[1];

      const meta = await client.readContract({
        address: house,
        abi: auctionHouseAbi,
        functionName: "getAuctionMeta",
        args: [expired.id],
      });
      if (meta.highestBidder && meta.highestBidder.toLowerCase() !== ZERO) {
        highestBidder = meta.highestBidder.toLowerCase();
        highestBid = fromTokenAmount(meta.highestBid);
      }

      if (!alreadySettled) {
        const hash = await wallet.writeContract({
          address: house,
          abi: auctionHouseAbi,
          functionName: "endAuction",
          args: [expired.id],
          account,
        });
        const receipt = await client.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          throw new Error("endAuction reverted");
        }
      }
    } catch (err) {
      console.error("[daily-auction] settle failed:", err);
      return { ok: false as const, error: err instanceof Error ? err.message : "settle failed" };
    }
  }

  const hasWinner = Boolean(highestBidder && highestBidder !== ZERO && highestBid > 0);
  await prisma.listing.update({
    where: { id: expired.id },
    data: {
      settledAt: now,
      winnerWallet: hasWinner ? highestBidder : null,
      status: hasWinner ? "SOLD" : "CANCELLED",
      slotsAvailable: 0,
    },
  });

  if (hasWinner) {
    await emailWinner(expired.id, expired.title, highestBidder, highestBid);
  }

  const next = await cloneDailyListing(expired);
  return { ok: true as const, settled: expired.id, next: next?.id ?? null, winner: hasWinner ? highestBidder : null };
}

async function cloneDailyListing(previous: {
  title: string;
  description: string | null;
  category: "SHOUTOUT" | "SPONSORED_POST" | "VIDEO_INTEGRATION" | "DEDICATED_VIDEO" | "LIVESTREAM" | "PODCAST" | "NEWSLETTER" | "AMA" | "COLLAB" | "CONSULTING" | "OTHER";
  price: number;
  currency: string;
  placement: string | null;
  platform: "YOUTUBE" | "TWITTER" | "INSTAGRAM" | "TIKTOK" | null;
  turnaroundDays: number | null;
  chainId: number | null;
  contractAddress: string | null;
  tokenAddress: string | null;
  tokenName: string | null;
  creatorId: string;
}) {
  const account = operatorAccount();
  const wallet = walletClient();
  const client = publicClient();
  const house = auctionHouseAddress();
  if (!account || !wallet) return null;

  const nextId = crypto.randomUUID();
  const endDate = new Date(Date.now() + 24 * 3_600_000);
  const token = (previous.tokenAddress || "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168") as `0x${string}`;
  const tokenName = previous.tokenName || "USDG";
  const amount = toTokenAmount(previous.price);

  const hash = await wallet.writeContract({
    address: house,
    abi: auctionHouseAbi,
    functionName: "startAuction",
    args: [nextId, token, tokenName, 24n, amount],
    account,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error("startAuction reverted");
  }

  return prisma.listing.create({
    data: {
      id: nextId,
      title: previous.title,
      description: previous.description,
      category: previous.category,
      pricingType: "AUCTION",
      price: previous.price,
      currency: previous.currency || "USDG",
      placement: previous.placement,
      platform: previous.platform,
      turnaroundDays: previous.turnaroundDays,
      slotsAvailable: 1,
      endDate,
      status: "ACTIVE",
      isDaily: true,
      chainId: previous.chainId ?? 4663,
      contractAddress: previous.contractAddress ?? house,
      tokenAddress: token,
      tokenName,
      txHash: hash,
      creatorId: previous.creatorId,
    },
  });
}

export function startDailyAuctionTicker() {
  const ms = 60_000;
  const tick = () => {
    void settleAndRolloverDailyAuction().catch((err) => {
      console.error("[daily-auction] ticker error:", err);
    });
  };
  tick();
  return setInterval(tick, ms);
}
