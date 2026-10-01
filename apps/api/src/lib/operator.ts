import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { findListingToken, fromTokenUnits } from "./tokens";
import { defineChain } from "viem";

const ROBINHOOD_ID = 4663;

export const robinhood = defineChain({
  id: ROBINHOOD_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"],
    },
  },
});

const FALLBACK_HOUSE = "0xc78D7dfc1A335C510FAC1e7E488861aDDb9fF1aF" as const;

const getListingTypeAbi = {
  type: "function",
  name: "getListingType",
  stateMutability: "view",
  inputs: [{ name: "_id", type: "string" }],
  outputs: [
    { name: "isFixedPrice", type: "bool" },
    { name: "settled", type: "bool" },
  ],
} as const;

const endAuctionAbi = {
  type: "function",
  name: "endAuction",
  stateMutability: "nonpayable",
  inputs: [{ name: "_auctionId", type: "string" }],
  outputs: [],
} as const;

export const auctionHouseAbi = [
  {
    type: "function",
    name: "startAuction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_auctionId", type: "string" },
      { name: "_token", type: "address" },
      { name: "durationHours", type: "uint256" },
      { name: "_minBid", type: "uint256" },
    ],
    outputs: [],
  },
  endAuctionAbi,
  {
    type: "function",
    name: "getAuctionMeta",
    stateMutability: "view",
    inputs: [{ name: "_auctionId", type: "string" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "deadline", type: "uint256" },
          { name: "auctionId", type: "string" },
          { name: "auctionOwner", type: "address" },
          { name: "token", type: "address" },
          { name: "price", type: "uint256" },
          { name: "highestBid", type: "uint256" },
          { name: "highestBidder", type: "address" },
          { name: "isFixedPrice", type: "bool" },
          { name: "settled", type: "bool" },
        ],
      },
    ],
  },
  getListingTypeAbi,
  {
    type: "function",
    name: "feePercent",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "feeReceiver",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "setFeeReceiver",
    stateMutability: "nonpayable",
    inputs: [{ name: "_newReceiver", type: "address" }],
    outputs: [],
  },
] as const;

/**
 * The USD-denominated contract that preceded per-listing tokens. Listings
 * created on it stay there until they close, so settlement still has to read
 * and end them — but its `getAuctionMeta` returns a different struct, and
 * decoding one with the other's ABI throws. That mismatch is what froze the
 * daily auction once before, so the ABI is chosen by the listing's recorded
 * contract (see `abiForHouse`), never assumed.
 */
export const legacyAuctionHouseAbi = [
  endAuctionAbi,
  getListingTypeAbi,
  {
    type: "function",
    name: "getAuctionMeta",
    stateMutability: "view",
    inputs: [{ name: "_auctionId", type: "string" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "deadline", type: "uint256" },
          { name: "auctionId", type: "string" },
          { name: "auctionOwner", type: "address" },
          { name: "priceUsdE8", type: "uint256" },
          { name: "highestBidUsdE8", type: "uint256" },
          { name: "highestBidder", type: "address" },
          { name: "highestBidToken", type: "address" },
          { name: "highestBidAmount", type: "uint256" },
          { name: "isFixedPrice", type: "bool" },
          { name: "settled", type: "bool" },
        ],
      },
    ],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function auctionHouseAddress() {
  const raw = process.env.AUCTION_HOUSE_ADDRESS?.trim();
  if (raw && /^0x[a-fA-F0-9]{40}$/.test(raw)) return raw as `0x${string}`;
  return FALLBACK_HOUSE;
}

/** Wallet that receives protocol fees and daily-auction winning-bid proceeds. */
export function feeRecipient(): `0x${string}` | null {
  const raw = process.env.FEE_RECIPIENT?.trim();
  if (!raw || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return getAddress(raw) as `0x${string}`;
}

export function operatorRpc() {
  return process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
}

export function operatorAccount() {
  const key = process.env.OPERATOR_PRIVATE_KEY?.trim();
  if (!key) return null;
  const hex = (key.startsWith("0x") ? key : `0x${key}`) as Hex;
  try {
    return privateKeyToAccount(hex);
  } catch {
    return null;
  }
}

export function publicClient() {
  return createPublicClient({
    chain: robinhood,
    transport: http(operatorRpc()),
  });
}

export function walletClient() {
  const account = operatorAccount();
  if (!account) return null;
  return createWalletClient({
    account,
    chain: robinhood,
    transport: http(operatorRpc()),
  });
}

/**
 * A listing's chain state, read through whichever ABI matches the contract it
 * was published to. Amounts come back in the listing's own unit: token units
 * of its token on the current contract, dollars on the legacy one (whose rows
 * were priced in USD). `payoutToken`/`payoutRaw` are what actually sits in
 * escrow for the leader, for anything that has to move it.
 */
export type ListingOnChain = {
  owner: string;
  settled: boolean;
  isFixedPrice: boolean;
  deadline: bigint;
  highestBidder: string;
  /** The leading bid (or sale price), in the listing's unit — see above. */
  highestBidAmount: number;
  /** Raw price/min bid on the current contract; USD-E8 on the legacy one. */
  priceRaw: bigint;
  /** The listing's token on the current contract; null on the legacy one, where buyers chose. */
  token: `0x${string}` | null;
  payoutToken: `0x${string}` | null;
  payoutRaw: bigint;
  legacy: boolean;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function isCurrentHouse(house: string) {
  return house.toLowerCase() === auctionHouseAddress().toLowerCase();
}

export async function readListingOnChain(
  house: `0x${string}`,
  id: string,
): Promise<ListingOnChain> {
  const client = publicClient();
  if (isCurrentHouse(house)) {
    const meta = await client.readContract({
      address: house,
      abi: auctionHouseAbi,
      functionName: "getAuctionMeta",
      args: [id],
    });
    const token = findListingToken(meta.token);
    return {
      owner: meta.auctionOwner,
      settled: meta.settled,
      isFixedPrice: meta.isFixedPrice,
      deadline: meta.deadline,
      highestBidder: meta.highestBidder,
      highestBidAmount: token ? fromTokenUnits(meta.highestBid, token) : 0,
      priceRaw: meta.price,
      token: meta.token === ZERO_ADDRESS ? null : meta.token,
      payoutToken: meta.token === ZERO_ADDRESS ? null : meta.token,
      payoutRaw: meta.highestBid,
      legacy: false,
    };
  }

  const meta = await client.readContract({
    address: house,
    abi: legacyAuctionHouseAbi,
    functionName: "getAuctionMeta",
    args: [id],
  });
  return {
    owner: meta.auctionOwner,
    settled: meta.settled,
    isFixedPrice: meta.isFixedPrice,
    deadline: meta.deadline,
    highestBidder: meta.highestBidder,
    highestBidAmount: Number(meta.highestBidUsdE8) / 1e8,
    priceRaw: meta.priceUsdE8,
    token: null,
    payoutToken: meta.highestBidToken === ZERO_ADDRESS ? null : meta.highestBidToken,
    payoutRaw: meta.highestBidAmount,
    legacy: true,
  };
}

/** Ends an auction on whichever contract holds it. `endAuction` is the same on both. */
export function endAuctionOn(house: `0x${string}`, id: string) {
  const wallet = walletClient();
  const account = operatorAccount();
  if (!wallet || !account) throw new Error("OPERATOR_PRIVATE_KEY unset");
  return wallet.writeContract({
    address: house,
    abi: isCurrentHouse(house) ? auctionHouseAbi : legacyAuctionHouseAbi,
    functionName: "endAuction",
    args: [id],
    account,
  });
}

/** The contract a stored listing lives on, or null when it was never published. */
export function recordedHouse(contractAddress: string | null | undefined): `0x${string}` | null {
  if (contractAddress && /^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return getAddress(contractAddress) as `0x${string}`;
  }
  return null;
}
