import { ethers } from "ethers";

// Known tokens on Base
const KNOWN_TOKENS: Record<string, string> = {
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "USDC",
  "0x4200000000000000000000000000000000000006": "WETH",
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": "DAI",
  "0x0000000000000000000000000000000000000000": "ETH",
};

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

const provider = new ethers.JsonRpcProvider(
  process.env.BASE_RPC_URL || "https://base-mainnet.g.alchemy.com/v2/CA4eh0FjTxMenSW3QxTpJ7D-vWMSHVjq"
);

export async function getCurrencyFromToken(tokenAddress: string): Promise<string> {
  const normalizedAddress = tokenAddress.toLowerCase();
  
  // Check known tokens first
  const known = KNOWN_TOKENS[normalizedAddress];
  if (known) return known;

  // Fallback: call token contract for symbol()
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const symbol = await contract.symbol();
    return symbol;
  } catch (error) {
    console.error("Error fetching token symbol:", error);
    return "UNKNOWN";
  }
}

export async function validateTokenAddress(tokenAddress: string): Promise<boolean> {
  // Basic validation
  if (!tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return false;
  }

  // Try to get symbol to verify it's a valid ERC20
  try {
    const currency = await getCurrencyFromToken(tokenAddress);
    return currency !== "UNKNOWN";
  } catch {
    return false;
  }
}

