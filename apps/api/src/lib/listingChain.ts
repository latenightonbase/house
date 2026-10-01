import { getAddress } from "viem";
import {
  auctionHouseAddress,
  readListingOnChain,
  robinhood,
  type ListingOnChain,
} from "./operator";
import { toTokenUnits, type ListingToken } from "./tokens";

/**
 * The contract rounds a duration up to whole hours from the block it lands in,
 * so an on-chain deadline sits at or just past the end date the seller picked —
 * never before it, and by less than an hour plus however long the transaction
 * took to confirm.
 *
 * The lower bound is what catches a listing signed for an hour but submitted
 * claiming a week, so it only has to be tight enough to separate those: minutes
 * of slack cost nothing there and keep a browser clock running slightly ahead
 * of chain time from failing an honest submission.
 */
const DEADLINE_SLACK_MS = 5 * 60_000;
const DEADLINE_ROUNDING_MS = 2 * 3_600_000;

export type ChainListingCheck =
  | { ok: true; deadline: Date; owner: string }
  | { ok: false; status: number; error: string };

const ZERO = "0x0000000000000000000000000000000000000000";

function sameAddress(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

async function readMeta(house: `0x${string}`, id: string): Promise<ListingOnChain | "unreachable"> {
  try {
    return await readListingOnChain(house, id);
  } catch (err) {
    console.error("[listing] could not read listing state on-chain:", err);
    return "unreachable";
  }
}

/**
 * Confirms a listing really is on the AuctionHouse, owned by the person who
 * submitted it, priced in the token and amount the row says, and dated the way
 * the row says.
 *
 * Sellers now sign at submission rather than after approval, which makes an
 * admin's approve click the only thing standing between a row and a live,
 * buyable listing. Nothing else would ever look at the chain again, so a
 * client that posted an invented `txHash` would get a listing published that
 * buyers could only ever fail to buy. The contract already records the owner,
 * price, type and deadline — ask it rather than trusting the submission.
 */
export async function verifyListingOnChain(input: {
  id: string;
  price: number;
  token: ListingToken;
  pricingType: "FIXED" | "AUCTION";
  endDate: Date;
  chainId: number;
  contractAddress: string;
  wallets: Array<{ address: string }>;
}): Promise<ChainListingCheck> {
  if (input.chainId !== robinhood.id) {
    return { ok: false, status: 400, error: "Listings settle on Robinhood Chain." };
  }

  // Pinned to the contract this deployment actually reads and settles through.
  // Accepting the client's address would let a submission point at a lookalike
  // contract that says whatever it likes about who owns the listing.
  const house = auctionHouseAddress();
  if (!sameAddress(input.contractAddress, house)) {
    return {
      ok: false,
      status: 400,
      error: "This listing was written to a different contract than the marketplace settles on.",
    };
  }

  const meta = await readMeta(house, input.id);
  if (meta === "unreachable") {
    return {
      ok: false,
      status: 503,
      error: "Could not reach the chain to confirm the listing. Try again in a moment.",
    };
  }

  if (!meta.owner || sameAddress(meta.owner, ZERO)) {
    return {
      ok: false,
      status: 402,
      error: "No listing with this id exists on the AuctionHouse yet.",
    };
  }

  const owned = new Set(input.wallets.map((w) => w.address.toLowerCase()));
  if (!owned.has(meta.owner.toLowerCase())) {
    return {
      ok: false,
      status: 403,
      error: "This listing was created on-chain by a wallet that is not on your account.",
    };
  }

  if (meta.settled) {
    return { ok: false, status: 409, error: "This listing has already settled on-chain." };
  }

  const wantsFixed = input.pricingType === "FIXED";
  if (meta.isFixedPrice !== wantsFixed) {
    return {
      ok: false,
      status: 400,
      error: wantsFixed
        ? "This id is an auction on-chain, not a fixed-price listing."
        : "This id is a fixed-price listing on-chain, not an auction.",
    };
  }

  if (!sameAddress(meta.token, input.token.address)) {
    return {
      ok: false,
      status: 400,
      error: `This listing is priced in a different token on-chain, not ${input.token.symbol}.`,
    };
  }

  if (meta.priceRaw !== toTokenUnits(input.price, input.token)) {
    return {
      ok: false,
      status: 400,
      error: "The price on-chain does not match the one submitted.",
    };
  }

  const deadline = new Date(Number(meta.deadline) * 1000);
  if (deadline.getTime() <= Date.now()) {
    return { ok: false, status: 409, error: "This listing has already closed on-chain." };
  }
  const endsAt = input.endDate.getTime();
  if (
    deadline.getTime() < endsAt - DEADLINE_SLACK_MS ||
    deadline.getTime() > endsAt + DEADLINE_ROUNDING_MS
  ) {
    return {
      ok: false,
      status: 400,
      error: "The closing time on-chain does not match the one submitted.",
    };
  }

  return { ok: true, deadline, owner: getAddress(meta.owner) };
}

/**
 * The lighter re-check an admin's approval runs. The full shape was verified at
 * submission; what can still have changed since is the clock and, for a
 * fixed-price listing bought straight off the contract, whether it is spent.
 */
export async function assertListingStillOpen(listing: {
  id: string;
  contractAddress: string | null;
}): Promise<ChainListingCheck> {
  const house = auctionHouseAddress();
  if (!sameAddress(listing.contractAddress, house)) {
    return {
      ok: false,
      status: 409,
      error: "This listing is not wired to the AuctionHouse the marketplace settles on.",
    };
  }

  const meta = await readMeta(house, listing.id);
  if (meta === "unreachable") {
    return {
      ok: false,
      status: 503,
      error: "Could not reach the chain to confirm the listing. Try again in a moment.",
    };
  }

  if (!meta.owner || sameAddress(meta.owner, ZERO)) {
    return { ok: false, status: 409, error: "This listing is no longer on the AuctionHouse." };
  }
  if (meta.settled) {
    return { ok: false, status: 409, error: "This listing has already settled on-chain." };
  }

  const deadline = new Date(Number(meta.deadline) * 1000);
  if (deadline.getTime() <= Date.now()) {
    return {
      ok: false,
      status: 409,
      error: "This listing closed on-chain before it was reviewed — the seller has to resubmit it.",
    };
  }

  return { ok: true, deadline, owner: getAddress(meta.owner) };
}
