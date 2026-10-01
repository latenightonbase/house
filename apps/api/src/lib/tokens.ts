import { formatUnits, parseUnits } from "viem";

/**
 * The ERC-20s a listing can be priced in. The seller picks one at creation and
 * every bid or purchase on that listing is paid in it — the AuctionHouse never
 * converts between them, so these are also exactly the tokens the deployed
 * contract was constructed to accept.
 */
export type ListingToken = {
  address: `0x${string}`;
  symbol: "USDG" | "LNOC";
  decimals: number;
};

/** Global Dollar — Robinhood Chain's stable. */
export const USDG: ListingToken = {
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  symbol: "USDG",
  decimals: 6,
};

/** Late Night Onchain, the house token. */
export const LNOC: ListingToken = {
  address: "0x076277c3d6b57B4aad34c592cd2f138e9316a991",
  symbol: "LNOC",
  decimals: 18,
};

export const LISTING_TOKENS: readonly ListingToken[] = [USDG, LNOC];

export function findListingToken(address: string | null | undefined): ListingToken | null {
  if (!address) return null;
  return LISTING_TOKENS.find((t) => t.address.toLowerCase() === address.toLowerCase()) ?? null;
}

/**
 * The token a stored listing settles in. Rows from before tokens were chosen
 * per listing carry no address; they were priced in dollars and settled in
 * USDG, so that is what they read as.
 */
export function listingToken(listing: { tokenAddress: string | null }): ListingToken {
  return findListingToken(listing.tokenAddress) ?? USDG;
}

/**
 * Prices are entered with at most two decimals, so six is exact for every
 * listing token and keeps `toFixed` clear of float noise. The app converts with
 * the same rule, which is what lets the API compare an on-chain price to the
 * submitted number exactly.
 */
const PRICE_PRECISION = 6;

export function toTokenUnits(amount: number, token: ListingToken): bigint {
  return parseUnits(amount.toFixed(Math.min(token.decimals, PRICE_PRECISION)), token.decimals);
}

export function fromTokenUnits(raw: bigint, token: ListingToken): number {
  return Number(formatUnits(raw, token.decimals));
}

export function formatTokenAmount(amount: number, symbol: string) {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: amount < 1 ? 4 : 2 })} ${symbol}`;
}
