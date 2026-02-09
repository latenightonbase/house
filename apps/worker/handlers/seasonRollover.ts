import mongoose from 'mongoose';
import { resetSeason } from '../../web/utils/xpService';
import User from '../../web/utils/schemas/User';
import { distributeSeasonRewards } from '../utils/distributeSeasonRewards';

export async function handleSeasonRollover() {
  console.log('🔄 [SEASON ROLLOVER] Starting season rollover process...');
  
  let distributionResult = null;
  
  try {
    // Ensure DB is connected
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ [SEASON ROLLOVER] MongoDB not connected');
      throw new Error('Database not connected');
    }
    
    // Query top 10 users by seasonal XP BEFORE resetting
    console.log('🏆 [SEASON ROLLOVER] Fetching top 10 users for reward distribution...');
    const topUsers = await User.find({ currentSeasonXP: { $gt: 0 } })
      .sort({ currentSeasonXP: -1 })
      .limit(10)
      .select('wallets currentSeasonXP');
    
    console.log(`📋 [SEASON ROLLOVER] Found ${topUsers.length} eligible users for distribution`);
    
    // Distribute rewards to top users
    if (topUsers.length > 0) {
      try {
        console.log('💰 [SEASON ROLLOVER] Starting token distribution...');
        distributionResult = await distributeSeasonRewards(topUsers);
        
        if (distributionResult.successfulTransfers > 0) {
          console.log(`✅ [SEASON ROLLOVER] Distributed ${distributionResult.totalDistributed} tokens ($${distributionResult.totalDistributedUSD}) to ${distributionResult.successfulTransfers} users`);
        }
        
        if (distributionResult.failedTransfers.length > 0) {
          console.log(`⚠️ [SEASON ROLLOVER] ${distributionResult.failedTransfers.length} transfers failed`);
        }
      } catch (distributionError) {
        console.error('❌ [SEASON ROLLOVER] Distribution failed, but continuing with season reset:', distributionError);
        // Continue with season reset even if distribution fails
      }
    } else {
      console.log('ℹ️ [SEASON ROLLOVER] No users with seasonal XP found, skipping distribution');
    }
    
    console.log('📊 [SEASON ROLLOVER] Archiving current season and resetting XP...');
    await resetSeason();
    
    console.log('✅ [SEASON ROLLOVER] Season rollover completed successfully');
    
    return {
      success: true,
      message: 'Season rollover completed',
      timestamp: new Date().toISOString(),
      distribution: distributionResult ? {
        totalDistributed: distributionResult.totalDistributed,
        totalDistributedUSD: distributionResult.totalDistributedUSD,
        tokenPrice: distributionResult.tokenPrice,
        successfulTransfers: distributionResult.successfulTransfers,
        failedTransfers: distributionResult.failedTransfers.length,
        recipients: distributionResult.transfers.length,
      } : null,
    };
  } catch (error) {
    console.error('❌ [SEASON ROLLOVER] Error during season rollover:', error);
    throw error;
  }
}
