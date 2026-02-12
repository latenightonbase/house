import { ethers } from 'ethers';
import { auctionAbi, contractAdds, erc20Abi } from '@repo/contracts';
import { decryptPrivateKey } from './walletEncryption';
import { IBotWallet } from './schemas/BotWallet';

const BASE_RPC_URL =
  process.env.BASE_RPC_URL ||
  'https://base-mainnet.g.alchemy.com/v2/CA4eh0FjTxMenSW3QxTpJ7D-vWMSHVjq';

const AUCTION_CONTRACT = contractAdds.auctions;

/**
 * Get an ethers Wallet signer from an encrypted bot wallet
 */
function getWalletSigner(botWallet: IBotWallet): ethers.Wallet {
  const privateKey = decryptPrivateKey({
    encrypted: botWallet.encryptedPrivateKey,
    iv: botWallet.iv,
    authTag: botWallet.authTag,
  });

  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Get a read-only provider
 */
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(BASE_RPC_URL);
}

/**
 * Get ETH and token balances for a wallet address
 */
export async function getWalletBalances(
  address: string,
  tokenAddress?: string
): Promise<{
  ethBalance: string;
  tokenBalance: string | null;
  tokenDecimals: number | null;
  tokenSymbol: string | null;
}> {
  const provider = getProvider();

  const ethBalance = await provider.getBalance(address);

  let tokenBalance: string | null = null;
  let tokenDecimals: number | null = null;
  let tokenSymbol: string | null = null;

  if (tokenAddress) {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
      const [balance, decimals, symbol] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.decimals(),
        tokenContract.symbol(),
      ]);
      tokenBalance = ethers.formatUnits(balance, decimals);
      tokenDecimals = Number(decimals);
      tokenSymbol = symbol;
    } catch (error) {
      console.error('Error fetching token balance:', error);
    }
  }

  return {
    ethBalance: ethers.formatEther(ethBalance),
    tokenBalance,
    tokenDecimals,
    tokenSymbol,
  };
}

/**
 * Create an auction on-chain using the bot wallet
 */
export async function createAuctionOnChain(
  botWallet: IBotWallet,
  params: {
    auctionId: string;
    tokenAddress: string;
    tokenName: string;
    durationHours: number;
    minBidAmount: bigint;
  }
): Promise<{ txHash: string; receipt: ethers.TransactionReceipt }> {
  const signer = getWalletSigner(botWallet);

  const auctionContract = new ethers.Contract(
    AUCTION_CONTRACT,
    auctionAbi,
    signer
  );

  console.log(`[ServerWallet] Creating auction ${params.auctionId} from ${botWallet.address}`);

  const tx = await auctionContract.startAuction(
    params.auctionId,
    params.tokenAddress,
    params.tokenName,
    BigInt(params.durationHours),
    params.minBidAmount
  );

  console.log(`[ServerWallet] Tx submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`[ServerWallet] Tx confirmed in block ${receipt.blockNumber}`);

  return { txHash: tx.hash, receipt };
}

/**
 * Place a bid on-chain using the bot wallet.
 * Handles ERC20 approval + placeBid in sequence.
 */
export async function placeBidOnChain(
  botWallet: IBotWallet,
  params: {
    auctionId: string;
    tokenAddress: string;
    bidAmountWei: bigint;
    fid: string;
  }
): Promise<{ approveTxHash: string; bidTxHash: string; receipt: ethers.TransactionReceipt }> {
  const signer = getWalletSigner(botWallet);

  // Step 1: Approve the auction contract to spend tokens
  const tokenContract = new ethers.Contract(
    params.tokenAddress,
    erc20Abi,
    signer
  );

  console.log(`[ServerWallet] Approving ${params.bidAmountWei} tokens for auction contract`);

  // Check current allowance
  const currentAllowance = await tokenContract.allowance(
    botWallet.address,
    AUCTION_CONTRACT
  );

  let approveTxHash = '';
  if (currentAllowance < params.bidAmountWei) {
    const approveTx = await tokenContract.approve(
      AUCTION_CONTRACT,
      params.bidAmountWei
    );
    approveTxHash = approveTx.hash;
    await approveTx.wait();
    console.log(`[ServerWallet] Approval confirmed: ${approveTxHash}`);
  } else {
    console.log(`[ServerWallet] Sufficient allowance already exists`);
  }

  // Step 2: Place the bid
  const auctionContract = new ethers.Contract(
    AUCTION_CONTRACT,
    auctionAbi,
    signer
  );

  console.log(`[ServerWallet] Placing bid on auction ${params.auctionId}`);

  const bidTx = await auctionContract.placeBid(
    params.auctionId,
    params.bidAmountWei,
    params.fid
  );

  console.log(`[ServerWallet] Bid tx submitted: ${bidTx.hash}`);

  const receipt = await bidTx.wait();
  console.log(`[ServerWallet] Bid confirmed in block ${receipt.blockNumber}`);

  return { approveTxHash, bidTxHash: bidTx.hash, receipt };
}

/**
 * Get token decimals for a given token address
 */
export async function getTokenDecimals(tokenAddress: string): Promise<number> {
  const KNOWN_TOKENS: Record<string, number> = {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 6, // USDC
    '0x4200000000000000000000000000000000000006': 18, // WETH
  };

  const known = KNOWN_TOKENS[tokenAddress.toLowerCase()];
  if (known !== undefined) return known;

  try {
    const provider = getProvider();
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    const decimals = await tokenContract.decimals();
    return Number(decimals);
  } catch {
    return 18;
  }
}

/**
 * Get token symbol for a given token address
 */
export async function getTokenSymbol(tokenAddress: string): Promise<string> {
  const KNOWN_TOKENS: Record<string, string> = {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
    '0x4200000000000000000000000000000000000006': 'WETH',
  };

  const known = KNOWN_TOKENS[tokenAddress.toLowerCase()];
  if (known) return known;

  try {
    const provider = getProvider();
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    return await tokenContract.symbol();
  } catch {
    return 'TOKEN';
  }
}
