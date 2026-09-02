import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
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

const FALLBACK_HOUSE = "0xFfFABB522bB1Ff6F15F505a99c542f57e9378037" as const;

export const auctionHouseAbi = [
  {
    type: "function",
    name: "startAuction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_auctionId", type: "string" },
      { name: "_token", type: "address" },
      { name: "_tokenName", type: "string" },
      { name: "durationHours", type: "uint256" },
      { name: "_minBidAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "endAuction",
    stateMutability: "nonpayable",
    inputs: [{ name: "_auctionId", type: "string" }],
    outputs: [],
  },
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
          { name: "caInUse", type: "address" },
          { name: "tokenName", type: "string" },
          { name: "deadline", type: "uint256" },
          { name: "auctionId", type: "string" },
          { name: "auctionOwner", type: "address" },
          { name: "highestBid", type: "uint256" },
          { name: "highestBidder", type: "address" },
          { name: "minBidAmount", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getListingType",
    stateMutability: "view",
    inputs: [{ name: "_id", type: "string" }],
    outputs: [
      { name: "isFixedPrice", type: "bool" },
      { name: "settled", type: "bool" },
    ],
  },
] as const;

export function auctionHouseAddress() {
  const raw = process.env.AUCTION_HOUSE_ADDRESS?.trim();
  if (raw && /^0x[a-fA-F0-9]{40}$/.test(raw)) return raw as `0x${string}`;
  return FALLBACK_HOUSE;
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

export function toTokenAmount(amount: number, decimals = 6) {
  return parseUnits(amount.toFixed(decimals), decimals);
}

export function fromTokenAmount(raw: bigint, decimals = 6) {
  return Number(raw) / 10 ** decimals;
}
