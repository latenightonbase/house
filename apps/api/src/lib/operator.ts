import {
  createPublicClient,
  createWalletClient,
  getAddress,
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

export function toTokenAmount(amount: number, decimals = 6) {
  return parseUnits(amount.toFixed(decimals), decimals);
}

export function fromTokenAmount(raw: bigint, decimals = 6) {
  return Number(raw) / 10 ** decimals;
}
