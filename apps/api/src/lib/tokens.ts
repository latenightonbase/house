import { erc20Abi, formatUnits, getAddress, parseUnits } from "viem";
import { publicClient } from "./operator";
import { getMarketToken } from "./tokenMarket";

/**
 * The ERC-20 a listing is priced in. The seller picks it at creation and every
 * bid or purchase on that listing is paid in it — the AuctionHouse never
 * converts between tokens. USDG and LNOC are offered by name; any other
 * Robinhood Chain ERC-20 can be entered by address and is looked up on
 * DexScreener and CoinGecko.
 */
export type ListingToken = {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  /** From DexScreener or CoinGecko; the app has its own art for USDG and LNOC. */
  logoUrl?: string | null;
};

/** Global Dollar — Robinhood Chain's stable. */
export const USDG: ListingToken = {
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  symbol: "USDG",
  name: "Global Dollar",
  decimals: 6,
};

/** Late Night Onchain, the house token. */
export const LNOC: ListingToken = {
  address: "0x076277c3d6b57B4aad34c592cd2f138e9316a991",
  symbol: "LNOC",
  name: "Late Night Onchain",
  decimals: 18,
};

/** The tokens the create form offers by name. */
export const LISTING_TOKENS: readonly ListingToken[] = [USDG, LNOC];

export function findListingToken(address: string | null | undefined): ListingToken | null {
  if (!address) return null;
  return LISTING_TOKENS.find((t) => t.address.toLowerCase() === address.toLowerCase()) ?? null;
}

/**
 * The token a stored listing settles in. Rows from before tokens were chosen
 * per listing carry no address; they were priced in dollars and settled in
 * USDG, so that is what they read as. A token entered by address carries the
 * symbol and decimals it was saved with.
 */
export function listingToken(listing: {
  tokenAddress: string | null;
  tokenName: string | null;
  tokenDecimals: number | null;
}): ListingToken {
  const known = findListingToken(listing.tokenAddress);
  if (known) return known;
  if (isAddress(listing.tokenAddress) && listing.tokenDecimals != null) {
    const symbol = listing.tokenName ?? "TOKEN";
    return {
      address: getAddress(listing.tokenAddress),
      symbol,
      name: symbol,
      decimals: listing.tokenDecimals,
    };
  }
  return USDG;
}

function isAddress(value: string | null | undefined): value is `0x${string}` {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

/**
 * Symbols a token entered by address may not use. The marketplace prints a
 * listing's symbol next to its price, and the "USD"/"USDC" of rows from before
 * per-listing tokens even print as dollars — so a lookalike token calling
 * itself one of these would read as something it is not.
 */
const RESERVED_SYMBOLS = new Set(["USDG", "LNOC", "USD", "USDC"]);

export function imitatesKnownToken(token: ListingToken) {
  return !findListingToken(token.address) && RESERVED_SYMBOLS.has(token.symbol.toUpperCase());
}

/** Upper bound on decimals — past this a price no longer fits sensibly in token units. */
const MAX_DECIMALS = 36;

/** Strips control characters and caps the length of a name read from a token contract. */
function cleanLabel(value: string, max: number) {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

// Decimals never change, so a token's are read once per process. A failed
// read is not cached — the next request tries again.
const chainDecimals = new Map<string, number>();

/** The token contract's own `decimals()`, or null when it does not answer as an ERC-20. */
async function decimalsOnChain(address: `0x${string}`): Promise<number | null> {
  const key = address.toLowerCase();
  const cached = chainDecimals.get(key);
  if (cached != null) return cached;
  try {
    const decimals = await publicClient().readContract({
      address,
      abi: erc20Abi,
      functionName: "decimals",
    });
    chainDecimals.set(key, decimals);
    return decimals;
  } catch {
    return null;
  }
}

/**
 * Decimals for settling a listing — from the constants or the token contract,
 * never an indexer, so moving escrowed funds does not depend on a third-party
 * API being up or still listing the token.
 */
export async function settlementDecimals(address: `0x${string}`): Promise<number | null> {
  return findListingToken(address)?.decimals ?? (await decimalsOnChain(getAddress(address)));
}

/**
 * Any Robinhood Chain token, by address: USDG and LNOC from the constants,
 * anything else from DexScreener and CoinGecko — name, symbol and logo, and
 * decimals from CoinGecko's contract record. Only a token CoinGecko has no
 * decimals for costs a chain read, since those decide what buyers pay and
 * cannot be guessed. Null when neither indexer lists the token; throws when
 * neither could be reached, so a caller can tell "unknown" from "try again".
 */
export async function resolveListingToken(
  address: string | null | undefined,
): Promise<ListingToken | null> {
  if (!isAddress(address)) return null;
  const known = findListingToken(address);
  if (known) return known;

  const market = await getMarketToken(address);
  if (!market?.symbol) return null;

  const checksummed = getAddress(address);
  const decimals = market.decimals ?? (await decimalsOnChain(checksummed));
  if (decimals == null || decimals < 0 || decimals > MAX_DECIMALS) return null;

  const symbol = cleanLabel(market.symbol, 16);
  if (!symbol) return null;
  return {
    address: checksummed,
    symbol,
    name: (market.name && cleanLabel(market.name, 64)) || symbol,
    decimals,
    logoUrl: market.logoUrl,
  };
}

/**
 * How many decimals a price may have in `token`. The form takes cents, but a
 * token with fewer decimals than that cannot represent them on-chain.
 */
export function priceDecimals(token: ListingToken) {
  return Math.min(2, token.decimals);
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
