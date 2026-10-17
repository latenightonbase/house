import { prisma } from "../db";
import { introduceBuyerAndSeller } from "./chat/dealThread";
import {
  endAuctionOn,
  operatorAccount,
  publicClient,
  readListingOnChain,
  recordedHouse,
} from "./operator";

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * Settlement for every AUCTION listing once its clock runs out.
 *
 * On-chain is the authority when the listing was published to the AuctionHouse
 * (`contractAddress` + `txHash` set). A marketplace-only listing has no chain
 * wiring, so the highest stored bid decides it. Proceeds are never forwarded
 * anywhere: the contract pays the seller, who is the listing's own creator.
 *
 * Leftover rows from the retired daily auction are swept here too, so the last
 * one opened before it was switched off still closes on-chain at its deadline.
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
  currency: string;
  contractAddress: string | null;
  txHash: string | null;
  creator: { userId: string };
  bids: Array<{ bidderWallet: string; amount: number }>;
};

/** Auctions whose clock has run out but which have never been settled. */
function expiredAuctionWhere(now: Date) {
  return {
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
  // Read and ended on the contract it was published to — a listing opened
  // before a redeploy still lives on the old one.
  const house = recordedHouse(listing.contractAddress);
  if (!house || !listing.txHash) return null;

  if (!operatorAccount()) {
    console.warn("[auction-settle] OPERATOR_PRIVATE_KEY unset — using stored bids");
    return null;
  }

  const meta = await readListingOnChain(house, listing.id);
  if (!meta.settled) {
    const hash = await endAuctionOn(house, listing.id);
    const receipt = await publicClient().waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") throw new Error("endAuction reverted");
  }

  if (!meta.highestBidder || meta.highestBidder.toLowerCase() === ZERO) {
    return { winner: "", amount: 0 };
  }
  return { winner: meta.highestBidder.toLowerCase(), amount: meta.highestBidAmount };
}

/**
 * Puts the winner and the seller in touch: a thread with an opening message
 * from each, plus an email to both. The winner is found by wallet — bids need
 * a session, so in practice every winning wallet belongs to an account.
 */
async function introduceWinner(listing: ExpiredAuction, wallet: string, amount: number) {
  const winner = await prisma.user.findFirst({
    where: { wallets: { some: { address: wallet.toLowerCase() } } },
    select: { id: true },
  });
  if (!winner) {
    console.warn(`[auction-settle] ${listing.id} winner ${wallet} has no account to contact`);
    return;
  }
  await introduceBuyerAndSeller({
    via: "auction",
    listing: { id: listing.id, title: listing.title, currency: listing.currency },
    sellerId: listing.creator.userId,
    buyerId: winner.id,
    amount,
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

  if (hasWinner) await introduceWinner(listing, winner, amount);

  console.log(
    `[auction-settle] settled ${listing.id} winner=${hasWinner ? winner : "none"}`,
  );
  return { ok: true, listingId: listing.id, winner: hasWinner ? winner : null, amount };
}

/**
 * Sweeps every expired auction. One listing failing (a reverted tx, a dead
 * RPC) leaves the rest to settle rather than aborting the batch.
 */
export async function settleExpiredAuctions(now = new Date()): Promise<SettleSweep> {
  const expired = await prisma.listing.findMany({
    where: expiredAuctionWhere(now),
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      contractAddress: true,
      txHash: true,
      creator: { select: { userId: true } },
      bids: { orderBy: { amount: "desc" }, take: 1, select: { bidderWallet: true, amount: true } },
    },
  });

  const settled: SettleOne[] = [];
  for (const listing of expired) {
    settled.push(await settleAuction(listing, now));
  }
  return { checked: expired.length, settled };
}

let sweeping = false;

/**
 * Runs the settlement sweep every minute. A sweep still in flight (slow RPC,
 * several endAuction txs) is not overlapped by the next tick.
 */
export function startAuctionSettlementTicker() {
  const tick = async () => {
    if (sweeping) return;
    sweeping = true;
    try {
      await settleExpiredAuctions();
    } catch (err) {
      console.error("[auction-settle] ticker error:", err);
    } finally {
      sweeping = false;
    }
  };
  void tick();
  return setInterval(() => void tick(), 60_000);
}
