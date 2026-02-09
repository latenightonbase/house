import { ethers } from 'ethers';
import { erc20Abi } from '@repo/contracts';
import { fetchTokenPrice } from '../../web/utils/tokenPrice';

interface TopUser {
  wallets: string[];
  currentSeasonXP: number;
}

interface DistributionResult {
  success: boolean;
  totalDistributed: string;
  totalDistributedUSD: string;
  tokenPrice: string;
  successfulTransfers: number;
  failedTransfers: Array<{
    rank: number;
    wallet: string;
    amount: string;
    usdValue: string;
    error: string;
  }>;
  transfers: Array<{
    rank: number;
    wallet: string;
    amount: string;
    usdValue: string;
    txHash?: string;
  }>;
}

const TOKEN_ADDRESS = '0x05AF98aeBeC91AeF2BD893614a2C333C58855012';

// USD value distribution by rank
const USD_REWARDS = [
  500,  // 1st place
  350,  // 2nd place
  100,  // 3rd place
  50,   // 4th place
  50,   // 5th place
  50,   // 6th place
  50,   // 7th place
  50,   // 8th place
  50,   // 9th place
  50,   // 10th place
];

export async function distributeSeasonRewards(
  topUsers: TopUser[]
): Promise<DistributionResult> {
  console.log(`💰 [DISTRIBUTION] Starting season reward distribution for ${topUsers.length} users`);

  const result: DistributionResult = {
    success: true,
    totalDistributed: '0',
    totalDistributedUSD: '0',
    tokenPrice: '0',
    successfulTransfers: 0,
    failedTransfers: [],
    transfers: [],
  };

  // Validate environment variables
  const privateKey = process.env.SEASON_DISTRIBUTOR;
  const rpcUrl = process.env.RPC_URL;

  if (!privateKey) {
    console.error('❌ [DISTRIBUTION] SEASON_DISTRIBUTOR private key not found in environment');
    throw new Error('SEASON_DISTRIBUTOR environment variable is required');
  }

  if (!rpcUrl) {
    console.error('❌ [DISTRIBUTION] RPC_URL not found in environment');
    throw new Error('RPC_URL environment variable is required');
  }

  // Filter users with valid wallets
  const validUsers = topUsers.filter((user) => user.wallets && user.wallets.length > 0);
  
  if (validUsers.length === 0) {
    console.log('⚠️ [DISTRIBUTION] No users with valid wallets found');
    return result;
  }

  console.log(`📊 [DISTRIBUTION] ${validUsers.length} users eligible for distribution`);

  try {
    // Fetch current token price
    console.log(`💵 [DISTRIBUTION] Fetching token price...`);
    const tokenPrice = await fetchTokenPrice(TOKEN_ADDRESS);
    console.log(`💵 [DISTRIBUTION] Token price: $${tokenPrice}`);
    result.tokenPrice = tokenPrice.toString();

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`🔗 [DISTRIBUTION] Connected with wallet: ${wallet.address}`);

    // Setup ERC20 contract
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, erc20Abi, wallet);

    // Get token decimals
    const decimals = await tokenContract.decimals();
    console.log(`🪙 [DISTRIBUTION] Token decimals: ${decimals}`);

    let totalDistributedWei = BigInt(0);
    let totalDistributedUSD = 0;

    // Distribute to each user
    for (let i = 0; i < validUsers.length; i++) {
      const user = validUsers[i];
      const rank = i + 1;
      const recipientWallet = user.wallets[0];
      const usdValue = USD_REWARDS[i];

      // Calculate token amount based on USD value
      const tokenAmount = usdValue / tokenPrice;
      const tokenAmountFormatted = tokenAmount.toFixed(Number(decimals));
      
      console.log(`\n👤 [DISTRIBUTION] Rank ${rank}: ${recipientWallet}`);
      console.log(`   XP: ${user.currentSeasonXP}`);
      console.log(`   Reward: $${usdValue} = ${tokenAmountFormatted} tokens`);

      try {
        // Parse amount with proper decimals
        const amountWei = ethers.parseUnits(tokenAmountFormatted, decimals);
        
        // Execute transfer
        console.log(`   📤 Sending transaction...`);
        const tx = await tokenContract.transfer(recipientWallet, amountWei);
        
        console.log(`   ⏳ Waiting for confirmation... tx: ${tx.hash}`);
        await tx.wait();
        
        console.log(`   ✅ Transfer successful!`);

        result.successfulTransfers++;
        totalDistributedWei += amountWei;
        totalDistributedUSD += usdValue;
        
        result.transfers.push({
          rank,
          wallet: recipientWallet,
          amount: tokenAmountFormatted,
          usdValue: usdValue.toString(),
          txHash: tx.hash,
        });
      } catch (error) {
        console.error(`   ❌ Transfer failed:`, error);
        
        result.success = false;
        result.failedTransfers.push({
          rank,
          wallet: recipientWallet,
          amount: tokenAmountFormatted,
          usdValue: usdValue.toString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Format total distributed
    result.totalDistributed = ethers.formatUnits(totalDistributedWei, decimals);
    result.totalDistributedUSD = totalDistributedUSD.toString();

    console.log(`\n✅ [DISTRIBUTION] Distribution complete!`);
    console.log(`   Total distributed: ${result.totalDistributed} tokens ($${result.totalDistributedUSD})`);
    console.log(`   Successful: ${result.successfulTransfers}/${validUsers.length}`);
    console.log(`   Failed: ${result.failedTransfers.length}`);

    if (result.failedTransfers.length > 0) {
      console.log(`\n⚠️ [DISTRIBUTION] Failed transfers:`);
      result.failedTransfers.forEach((ft) => {
        console.log(`   Rank ${ft.rank} (${ft.wallet}): ${ft.error}`);
      });
    }

    return result;
  } catch (error) {
    console.error('❌ [DISTRIBUTION] Critical error during distribution:', error);
    throw error;
  }
}
