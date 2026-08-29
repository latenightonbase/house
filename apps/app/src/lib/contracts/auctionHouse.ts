import { parseAbi } from "viem";
import { robinhood } from "@/lib/chains";

/**
 * AuctionHouse — the contract in `apps/web/utils/contracts/auctionContract.sol`.
 *
 * Written by hand from the source rather than imported from `@repo/contracts`,
 * whose `auctionAbi` is the currently deployed build and predates fixed-price
 * listings. Keep this in step with the .sol file until the new build ships.
 */
export const auctionHouseAbi = parseAbi([
  "struct Bidders { address bidder; uint256 bidAmount; string fid; }",
  "struct AuctionMeta { address caInUse; string tokenName; uint256 deadline; string auctionId; address auctionOwner; uint256 highestBid; address highestBidder; uint256 minBidAmount; }",

  // Creating inventory
  "function startAuction(string _auctionId, address _token, string _tokenName, uint256 durationHours, uint256 _minBidAmount)",
  "function startFixedPriceListing(string _listingId, address _token, string _tokenName, uint256 durationHours, uint256 _price)",

  // Buying
  "function placeBid(string _auctionId, uint256 amount, string fid)",
  "function buyListing(string _listingId, string fid)",
  "function endAuction(string _auctionId)",

  // Views
  "function getAuctionMeta(string _auctionId) view returns (AuctionMeta)",
  "function getBidders(string _auctionId) view returns (Bidders[])",
  "function getListingType(string _id) view returns (bool isFixedPrice, bool settled)",
  "function getActiveAuctions() view returns (AuctionMeta[])",
  "function getActiveAuctionsByOwner(address _owner) view returns (AuctionMeta[])",
  "function feePercent() view returns (uint256)",
  "function feeReceiver() view returns (address)",

  // Events
  "event AuctionStarted(string indexed auctionId, address owner, string tokenName, uint256 deadline, uint256 minBidAmount)",
  "event ListingStarted(string indexed listingId, address owner, string tokenName, uint256 deadline, uint256 price)",
  "event BidPlaced(string indexed auctionId, address indexed bidder, uint256 amount, string fid)",
  "event AuctionEnded(string indexed auctionId, address winner, uint256 amount, address auctionOwner, uint256 feeTaken)",
  "event ListingSold(string indexed listingId, address buyer, uint256 amount, address listingOwner, uint256 feeTaken)",
]);

/** The contract caps an owner at three simultaneously open listings. */
export const MAX_ACTIVE_LISTINGS = 3;

/** Official Robinhood Chain stable — Global Dollar. */
export const USDG = {
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const,
  symbol: "USDG",
  decimals: 6,
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
  /** Passed to the contract as `_tokenName` and shown as the listing currency. */
  symbol: string;
  decimals: number;
}

/**
 * Tokens a listing can be priced in. The contract settles in whatever ERC-20
 * the listing was created with, so this is the seller's choice at creation.
 */
const TOKENS: Record<number, PaymentToken[]> = {
  [robinhood.id]: [USDG],
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

/**
 * The contract takes whole hours of duration, so an end date is rounded up —
 * a listing never closes earlier than the creator asked for.
 */
export function durationHoursUntil(endDate: Date, from: Date = new Date()): number {
  const ms = endDate.getTime() - from.getTime();
  return Math.max(1, Math.ceil(ms / 3_600_000));
}
