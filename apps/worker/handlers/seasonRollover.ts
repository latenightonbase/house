import mongoose from 'mongoose';
import { resetSeason } from '../../web/utils/xpService';

export async function handleSeasonRollover() {
  console.log('🔄 [SEASON ROLLOVER] Starting season rollover process...');
  
  try {
    // Ensure DB is connected
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ [SEASON ROLLOVER] MongoDB not connected');
      throw new Error('Database not connected');
    }
    
    console.log('📊 [SEASON ROLLOVER] Archiving current season and resetting XP...');
    await resetSeason();
    
    console.log('✅ [SEASON ROLLOVER] Season rollover completed successfully');
    
    return {
      success: true,
      message: 'Season rollover completed',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ [SEASON ROLLOVER] Error during season rollover:', error);
    throw error;
  }
}
