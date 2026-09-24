import { formatUnits, parseAbi, parseUnits } from "viem";
import { robinhood } from "@/lib/chains";

/**
 * AuctionHouse — the contract in `apps/web/utils/contracts/auctionContract.sol`.
 *
 * Written by hand from the source rather than imported from `@repo/contracts`,
 * whose `auctionAbi` is the currently deployed build and predates both
 * fixed-price listings and USD-denominated pricing. Keep this in step with the
 * .sol file until the new build ships.
 */
export const auctionHouseAbi = parseAbi([
  "struct Bidders { address bidder; uint256 bidAmount; address token; uint256 bidUsdE8; string fid; }",
  "struct AuctionMeta { uint256 deadline; string auctionId; address auctionOwner; uint256 priceUsdE8; uint256 highestBidUsdE8; address highestBidder; address highestBidToken; uint256 highestBidAmount; bool isFixedPrice; bool settled; }",
  "struct TokenConfig { bool accepted; uint8 decimals; uint256 usdPriceE8; uint64 updatedAt; uint64 maxAge; }",

  // Creating inventory — priced in USD, paid in any accepted token
  "function startAuction(string _auctionId, uint256 durationHours, uint256 _minBidUsdE8)",
  "function startFixedPriceListing(string _listingId, uint256 durationHours, uint256 _priceUsdE8)",

  // Buying
  "function placeBid(string _auctionId, address _token, uint256 amount, string fid)",
  "function buyListing(string _listingId, address _token, uint256 _maxTokenAmount, string fid)",
  "function endAuction(string _auctionId)",

  // Pricing
  "function quoteUsd(address _token, uint256 _usdE8) view returns (uint256)",
  "function quoteToken(address _token, uint256 _amount) view returns (uint256)",
  "function quoteListing(string _id, address _token) view returns (uint256 tokenAmount, uint256 usdE8)",
  "function tokenConfig(address) view returns (bool accepted, uint8 decimals, uint256 usdPriceE8, uint64 updatedAt, uint64 maxAge)",
  "function getAcceptedTokens() view returns (address[])",

  // Views
  "function getAuctionMeta(string _auctionId) view returns (AuctionMeta)",
  "function getBidders(string _auctionId) view returns (Bidders[])",
  "function getListingType(string _id) view returns (bool isFixedPrice, bool settled)",
  "function getActiveAuctions() view returns (AuctionMeta[])",
  "function getActiveAuctionsByOwner(address _owner) view returns (AuctionMeta[])",
  "function feePercent() view returns (uint256)",
  "function feeReceiver() view returns (address)",

  // Events
  "event AuctionStarted(string indexed auctionId, address owner, uint256 deadline, uint256 priceUsdE8)",
  "event ListingStarted(string indexed listingId, address owner, uint256 deadline, uint256 priceUsdE8)",
  "event BidPlaced(string indexed auctionId, address indexed bidder, address token, uint256 amount, uint256 usdE8, string fid)",
  "event AuctionEnded(string indexed auctionId, address winner, address token, uint256 amount, uint256 usdE8, address auctionOwner, uint256 feeTaken)",
  "event ListingSold(string indexed listingId, address buyer, address token, uint256 amount, uint256 usdE8, address listingOwner, uint256 feeTaken)",
  "event TokenPriceUpdated(address indexed token, uint256 usdPriceE8, uint64 updatedAt)",
]);

/** The contract caps an owner at three simultaneously open listings. */
export const MAX_ACTIVE_LISTINGS = 3;

/** Listing prices are USD with 8 decimals on-chain — 1e8 is $1.00. */
export const USD_DECIMALS = 8;

export function toUsdE8(usd: number): bigint {
  return parseUnits(usd.toFixed(USD_DECIMALS), USD_DECIMALS);
}

export function fromUsdE8(value: bigint): number {
  return Number(formatUnits(value, USD_DECIMALS));
}

/** Official Robinhood Chain stable — Global Dollar. Pegged, so always $1. */
export const USDG: PaymentToken = {
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  symbol: "USDG",
  decimals: 6,
  pegged: true,
};

/** The house token. Its USD rate is published on-chain by the contract owner. */
export const LNOC: PaymentToken = {
  address: "0x076277c3d6b57B4aad34c592cd2f138e9316a991",
  symbol: "LNOC",
  decimals: 18,
  pegged: false,
};

function normalize(value: string | undefined): `0x${string}` | undefined {
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as `0x${string}`) : undefined;
}

// Next inlines NEXT_PUBLIC_* only for literal property reads, so each one is
// spelled out here rather than looked up dynamically.
const FALLBACK_ADDRESS = normalize(process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS);

const DEPLOYED_ROBINHOOD = "0xFfFABB522bB1Ff6F15F505a99c542f57e9378037" as const;

const ADDRESSES: Record<number, `0x${string}` | undefined> = {
  [robinhood.id]:
    normalize(process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS_ROBINHOOD) ??
    FALLBACK_ADDRESS ??
    DEPLOYED_ROBINHOOD,
};

export interface PaymentToken {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  /** Dollar-pegged, so its on-chain rate never goes stale and $1 is $1. */
  pegged: boolean;
}

/**
 * Tokens a buyer can settle in. Listings are priced in USD, and the contract
 * converts at the rate it publishes for each token — so this is the buyer's
 * choice at payment time, not the seller's at creation.
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
 * The contract takes whole hours of duration, so an end date is rounded up —
 * a listing never closes earlier than the creator asked for.
 */
export function durationHoursUntil(endDate: Date, from: Date = new Date()): number {
  const ms = endDate.getTime() - from.getTime();
  return Math.max(1, Math.ceil(ms / 3_600_000));
}
