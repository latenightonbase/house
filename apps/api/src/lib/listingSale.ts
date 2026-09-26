import { getAddress } from "viem";
import { auctionHouseAbi, publicClient } from "./operator";

export type SaleCheck =
  | { ok: true; buyer: string }
  | { ok: false; status: number; error: string };

/**
 * The contract this listing was actually published to. Deliberately no fallback
 * to the configured address: a listing with no chain wiring was never published
 * at all, and checking it against the default contract would let an unrelated
 * settled id stand in as proof of payment.
 */
function resolveHouse(recorded: string | null | undefined): `0x${string}` | null {
  if (recorded && /^0x[a-fA-F0-9]{40}$/.test(recorded)) {
    return getAddress(recorded) as `0x${string}`;
  }
  return null;
}

/**
 * Confirms on-chain that a fixed-price listing has actually been paid for, and
 * that the payer is one of this session's wallets.
 *
 * Booking used to take the client's word for it: a `txHash` string was the only
 * evidence a listing had been bought and nothing ever looked at the chain, so
 * any signed-in account could POST an arbitrary hash and mark a listing SOLD
 * without paying. The contract already records the buyer — ask it instead.
 *
 * Verifying rather than trusting also makes the booking idempotent against a
 * lost session: a purchase that settled on-chain but never reached the API can
 * be recorded later, because the chain still says settled and still names the
 * same buyer. `txHash` survives as a reference, not as proof.
 */
export async function verifyFixedPriceSale(
  listing: { id: string; contractAddress: string | null },
  wallets: Array<{ address: string }>,
): Promise<SaleCheck> {
  const house = resolveHouse(listing.contractAddress);
  if (!house) {
    return {
      ok: false,
      status: 409,
      error: "This listing is not wired to the AuctionHouse, so a purchase cannot be confirmed.",
    };
  }

  let meta: { highestBidder: string; settled: boolean };
  try {
    meta = (await publicClient().readContract({
      address: house,
      abi: auctionHouseAbi,
      functionName: "getAuctionMeta",
      args: [listing.id],
    })) as unknown as { highestBidder: string; settled: boolean };
  } catch (err) {
    console.error("[book] could not read listing state on-chain:", err);
    return {
      ok: false,
      status: 503,
      error: "Could not reach the chain to confirm the purchase. Try again in a moment.",
    };
  }

  if (!meta.settled) {
    return {
      ok: false,
      status: 402,
      error: "No purchase for this listing has settled on-chain yet.",
    };
  }

  const buyer = meta.highestBidder.toLowerCase();
  const owned = new Set(wallets.map((w) => w.address.toLowerCase()));
  if (!owned.has(buyer)) {
    return {
      ok: false,
      status: 403,
      error: "This listing was bought by a wallet that is not on your account.",
    };
  }

  return { ok: true, buyer };
}
