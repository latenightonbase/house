import { formatUnits, parseAbi, parseUnits } from "viem";
import { robinhood } from "@/lib/chains";

/**
 * AuctionHouse — the contract in `apps/web/utils/contracts/auctionContract.sol`.
 *
 * Written by hand from the source rather than imported from `@repo/contracts`,
 * whose `auctionAbi` is an older build. Keep this in step with the .sol file.
 *
 * Every listing is priced in one token the seller picks — USDG or LNOC — and
 * bought or bid on in that same token, so amounts here are plain token units.
 */
export const auctionHouseAbi = parseAbi([
  "struct Bidders { address bidder; uint256 bidAmount; string fid; }",
  "struct AuctionMeta { uint256 deadline; string auctionId; address auctionOwner; address token; uint256 price; uint256 highestBid; address highestBidder; bool isFixedPrice; bool settled; }",

  // Creating inventory — the same call for either token
  "function startAuction(string _auctionId, address _token, uint256 durationHours, uint256 _minBid)",
  "function startFixedPriceListing(string _listingId, address _token, uint256 durationHours, uint256 _price)",

  // Buying, in the listing's own token
  "function placeBid(string _auctionId, uint256 amount, string fid)",
  "function buyListing(string _listingId, string fid)",
  "function endAuction(string _auctionId)",

  // Views
  "function acceptedToken(address) view returns (bool)",
  "function getAcceptedTokens() view returns (address[])",
  "function getAuctionMeta(string _auctionId) view returns (AuctionMeta)",
  "function getBidders(string _auctionId) view returns (Bidders[])",
  "function getListingType(string _id) view returns (bool isFixedPrice, bool settled)",
  "function getActiveAuctions() view returns (AuctionMeta[])",
  "function getActiveAuctionsByOwner(address _owner) view returns (AuctionMeta[])",
  "function feePercent() view returns (uint256)",
  "function feeReceiver() view returns (address)",

  // Events
  "event AuctionStarted(string indexed auctionId, address owner, address token, uint256 deadline, uint256 minBid)",
  "event ListingStarted(string indexed listingId, address owner, address token, uint256 deadline, uint256 price)",
  "event BidPlaced(string indexed auctionId, address indexed bidder, address token, uint256 amount, string fid)",
  "event AuctionEnded(string indexed auctionId, address winner, address token, uint256 amount, address auctionOwner, uint256 feeTaken)",
  "event ListingSold(string indexed listingId, address buyer, address token, uint256 amount, address listingOwner, uint256 feeTaken)",
]);

/** The contract caps an owner at three simultaneously open listings. */
export const MAX_ACTIVE_LISTINGS = 3;

/**
 * Prices are entered to the cent, so six decimals is exact for every listing
 * token and keeps `toFixed` clear of float noise. The API converts with the
 * same rule when it checks a submitted price against the chain.
 */
const PRICE_PRECISION = 6;

export function toTokenUnits(amount: number, token: PaymentToken): bigint {
  return parseUnits(amount.toFixed(Math.min(token.decimals, PRICE_PRECISION)), token.decimals);
}

export function fromTokenUnits(value: bigint, token: PaymentToken): number {
  return Number(formatUnits(value, token.decimals));
}

/** Global Dollar — Robinhood Chain's stable. */
export const USDG: PaymentToken = {
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  symbol: "USDG",
  name: "Global Dollar",
  decimals: 6,
  pegged: true,
  logo: "/tokens/usdg.png",
};

/** The house token. */
export const LNOC: PaymentToken = {
  address: "0x076277c3d6b57B4aad34c592cd2f138e9316a991",
  symbol: "LNOC",
  name: "Late Night Onchain",
  decimals: 18,
  pegged: false,
  logo: "/tokens/lnoc.jpg",
};

function normalize(value: string | undefined): `0x${string}` | undefined {
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as `0x${string}`) : undefined;
}

// Next inlines NEXT_PUBLIC_* only for literal property reads, so each one is
// spelled out here rather than looked up dynamically.
const FALLBACK_ADDRESS = normalize(process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS);

const DEPLOYED_ROBINHOOD = "0xc78D7dfc1A335C510FAC1e7E488861aDDb9fF1aF" as const;

const ADDRESSES: Record<number, `0x${string}` | undefined> = {
  [robinhood.id]:
    normalize(process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS_ROBINHOOD) ??
    FALLBACK_ADDRESS ??
    DEPLOYED_ROBINHOOD,
};

export interface PaymentToken {
  address: `0x${string}`;
  symbol: "USDG" | "LNOC";
  name: string;
  decimals: number;
  /** Dollar-pegged — its token amount already reads as dollars. */
  pegged: boolean;
  /** Path under /public. */
  logo: string;
}

/**
 * Tokens a seller can price a listing in. The choice is the seller's, made at
 * creation, and every bid or purchase on that listing is paid in it.
 */
const TOKENS: Record<number, PaymentToken[]> = {
  [robinhood.id]: [USDG, LNOC],
};

export const SUPPORTED_CHAIN_IDS = [robinhood.id] as const;

export const CHAIN_LABELS: Record<number, string> = {
  [robinhood.id]: "Robinhood",
};

export function auctionHouseAddress(chainId: number | undefined) {
  return chainId ? ADDRESSES[chainId] : undefined;
}

export function paymentTokens(chainId: number | undefined): PaymentToken[] {
  return (chainId && TOKENS[chainId]) || [];
}

export function findPaymentToken(chainId: number | undefined, address: string | undefined) {
  const tokens = paymentTokens(chainId);
  return (
    tokens.find((t) => t.address.toLowerCase() === address?.toLowerCase()) ?? tokens[0] ?? USDG
  );
}

/**
 * The token a listing is paid in. A row saved before sellers chose one has no
 * address; it was quoted in dollars and settled in USDG, so it reads as USDG.
 */
export function listingToken(listing: { chainId?: number; tokenAddress?: string }) {
  return findPaymentToken(listing.chainId ?? robinhood.id, listing.tokenAddress);
}

/**
 * True when a listing lives on the contract this build talks to. One opened
 * before the per-token redeploy stays on the retired contract until it closes,
 * whose functions take different arguments — so it is shown, but not bought.
 */
export function onCurrentHouse(listing: { chainId?: number; contractAddress?: string }) {
  const house = auctionHouseAddress(listing.chainId ?? robinhood.id);
  return Boolean(
    house && listing.contractAddress && listing.contractAddress.toLowerCase() === house.toLowerCase(),
  );
}

/**
 * The contract takes whole hours of duration, so an end date is rounded up —
 * a listing never closes earlier than the creator asked for.
 */
export function durationHoursUntil(endDate: Date, from: Date = new Date()): number {
  const ms = endDate.getTime() - from.getTime();
  return Math.max(1, Math.ceil(ms / 3_600_000));
}
