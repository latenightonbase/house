import { prisma } from "../db";
import { sendAuctionWon } from "./email";
import {
  auctionHouseAbi,
  auctionHouseAddress,
  fromUsdE8,
  operatorAccount,
  publicClient,
  walletClient,
} from "./operator";

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * Settlement for ordinary seller auctions — every AUCTION listing that is not
 * the rotating daily one. Until this existed only `isDaily` rows ever recorded
 * a winner, so a seller's own auction could expire with bids on it and leave
 * `winnerWallet` null forever; profile history had nothing to read.
 *
 * On-chain is the authority when the listing was published to the AuctionHouse
 * (`contractAddress` + `txHash` set). A marketplace-only listing has no chain
 * wiring, so the highest stored bid decides it. Unlike the daily auction this
 * never forwards proceeds to the fee recipient: the contract pays the seller,
 * and the seller here is the listing's own creator, not LNOC.
 */

export type SettleOne =
  | { ok: true; listingId: string; winner: string | null; amount: number }
  | { ok: false; listingId: string; error: string };

export type SettleSweep = {
  checked: number;
  settled: SettleOne[];
};

type ExpiredAuction = {
  id: string;
  title: string;
  price: number;
  contractAddress: string | null;
  txHash: string | null;
  bids: Array<{ bidderWallet: string; amount: number }>;
};

/** Auctions whose clock has run out but which have never been settled. */
function expiredAuctionWhere(now: Date) {
  return {
    isDaily: false,
    pricingType: "AUCTION" as const,
    status: "ACTIVE" as const,
    settledAt: null,
    endDate: { not: null, lte: now },
  };
}

/**
 * Reads the on-chain outcome and ends the auction if the operator has not
 * already. Returns null when there is no chain wiring or no operator key, which
 * tells the caller to fall back to the stored bids.
 */
async function onChainOutcome(
  listing: ExpiredAuction,
): Promise<{ winner: string; amount: number } | null> {
  if (!listing.contractAddress || !listing.txHash) return null;

  const account = operatorAccount();
  const wallet = walletClient();
  if (!account || !wallet) {
    console.warn("[auction-settle] OPERATOR_PRIVATE_KEY unset — using stored bids");
    return null;
  }

  const client = publicClient();
  const house = auctionHouseAddress();

  const [listingType, meta] = await Promise.all([
    client.readContract({
      address: house,
      abi: auctionHouseAbi,
      functionName: "getListingType",
      args: [listing.id],
    }),
    client.readContract({
      address: house,
      abi: auctionHouseAbi,
      functionName: "getAuctionMeta",
      args: [listing.id],
    }),
  ]);

  const alreadySettled = listingType[1];
  if (!alreadySettled) {
    const hash = await wallet.writeContract({
      address: house,
      abi: auctionHouseAbi,
      functionName: "endAuction",
      args: [listing.id],
      account,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") throw new Error("endAuction reverted");
  }

  if (!meta.highestBidder || meta.highestBidder.toLowerCase() === ZERO) {
    return { winner: "", amount: 0 };
  }
  return {
    winner: meta.highestBidder.toLowerCase(),
    amount: fromUsdE8(meta.highestBidUsdE8),
  };
}

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
    console.error("[auction-settle] auction-won email failed:", err);
  });
}

/**
 * Settles one expired auction. A run with no bids closes as CANCELLED rather
 * than SOLD, so profile history never shows a "winner" for an auction nobody
 * bid on.
 */
export async function settleAuction(listing: ExpiredAuction, now = new Date()): Promise<SettleOne> {
  let winner = listing.bids[0]?.bidderWallet?.toLowerCase() ?? "";
  let amount = listing.bids[0]?.amount ?? 0;

  try {
    const chain = await onChainOutcome(listing);
    if (chain) {
      winner = chain.winner;
      amount = chain.amount;
    }
  } catch (err) {
    console.error(`[auction-settle] ${listing.id} failed:`, err);
    return {
      ok: false,
      listingId: listing.id,
      error: err instanceof Error ? err.message : "settle failed",
    };
  }

  const hasWinner = Boolean(winner && winner !== ZERO && amount > 0);

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      settledAt: now,
      winnerWallet: hasWinner ? winner : null,
      status: hasWinner ? "SOLD" : "CANCELLED",
      slotsAvailable: 0,
    },
  });

  if (hasWinner) await emailWinner(listing.id, listing.title, winner, amount);

  console.log(
    `[auction-settle] settled ${listing.id} winner=${hasWinner ? winner : "none"}`,
  );
  return { ok: true, listingId: listing.id, winner: hasWinner ? winner : null, amount };
}

/**
 * Sweeps every expired ordinary auction. Runs alongside the daily-auction cron
 * on the same minute ticker; one listing failing (a reverted tx, a dead RPC)
 * leaves the rest to settle rather than aborting the batch.
 */
export async function settleExpiredAuctions(now = new Date()): Promise<SettleSweep> {
  const expired = await prisma.listing.findMany({
    where: expiredAuctionWhere(now),
    select: {
      id: true,
      title: true,
      price: true,
      contractAddress: true,
      txHash: true,
      bids: { orderBy: { amount: "desc" }, take: 1, select: { bidderWallet: true, amount: true } },
    },
  });

  const settled: SettleOne[] = [];
  for (const listing of expired) {
    settled.push(await settleAuction(listing, now));
  }
  return { checked: expired.length, settled };
}
