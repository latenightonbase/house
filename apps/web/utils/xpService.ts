import { Types } from 'mongoose';
import User, { IUser } from './schemas/User';
import Season, { ISeason } from './schemas/Season';
import SeasonLeaderboard, { ISeasonLeaderboard } from './schemas/SeasonLeaderboard';
import dbConnect from './db';

// XP Constants
export const XP_REWARDS = {
  CREATE_AUCTION: 10,
  BID_BASE: 5,
  BID_USD_MULTIPLIER: 0.1, // Additional XP per USD bid
  WIN_AUCTION_BASE: 100,
  WIN_AUCTION_USD_MULTIPLIER: 0.2, // Additional XP per USD won
  LEAVE_REVIEW: 25,
  DAILY_LOGIN: 5,
} as const;

// Level calculation: exponential formula (level² × 100)
export function calculateLevel(totalXP: number): number {
  if (totalXP <= 0) return 1;
  
  // Formula: XP required for level N = N² × 100
  // Reverse: level = sqrt(totalXP / 100)
  const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
  return Math.max(1, level);
}

// Get XP required for a specific level
export function getXPRequiredForLevel(level: number): number {
  return level * level * 100;
}

// Get XP required to reach next level
export function getXPToNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  const nextLevelXP = getXPRequiredForLevel(currentLevel + 1);
  return nextLevelXP - currentXP;
}

// Get current active season
export async function getCurrentSeason(): Promise<ISeason | null> {
  await dbConnect();
  
  const now = new Date();
  const season = await Season.findOne({
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ seasonNumber: -1 });
  
  return season;
}

// Get or create current season (creates if none exists)
export async function getOrCreateCurrentSeason(): Promise<ISeason> {
  await dbConnect();
  
  let season = await getCurrentSeason();
  
  if (!season) {
    // Create Season 1 if no season exists
    // Season 1 starts Feb 1, 2026
    const season1Start = new Date('2026-02-01T00:00:00.000Z');
    const season1End = new Date('2026-02-28T23:59:59.999Z');
    
    season = await Season.create({
      seasonNumber: 1,
      startDate: season1Start,
      endDate: season1End,
      active: true,
      totalXPAwarded: 0,
      totalParticipants: 0,
    }) as ISeason;
  }
  
  return season;
}

// Calculate XP for bidding action
export function calculateBidXP(usdValue: number): number {
  return Math.floor(XP_REWARDS.BID_BASE + (usdValue * XP_REWARDS.BID_USD_MULTIPLIER));
}

// Calculate XP for winning an auction
export function calculateWinXP(usdValue: number): number {
  return Math.floor(XP_REWARDS.WIN_AUCTION_BASE + (usdValue * XP_REWARDS.WIN_AUCTION_USD_MULTIPLIER));
}

// Award XP to a user
export interface AwardXPParams {
  userId: string | Types.ObjectId;
  amount: number;
  action: string;
  metadata?: {
    auctionId?: string | Types.ObjectId;
    usdValue?: number;
    [key: string]: any;
  };
}

export async function awardXP({
  userId,
  amount,
  action,
  metadata = {},
}: AwardXPParams): Promise<{ success: boolean; newLevel?: number; leveledUp?: boolean; error?: string }> {
  try {
    await dbConnect();
    
    // Ensure we're working with ObjectId
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    
    // Get current season (create if doesn't exist)
    const season = await getOrCreateCurrentSeason();
    
    // Check if season is active
    const now = new Date();
    if (!season.active || now < season.startDate || now > season.endDate) {
      console.warn(`Cannot award XP: Season ${season.seasonNumber} is not active`);
      return { success: false, error: 'No active season' };
    }
    
    // Get user's current state
    const user = await User.findById(userObjectId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    const oldLevel = user.level || 1;
    const newTotalXP = (user.totalXP || 0) + amount;
    const newSeasonXP = (user.currentSeasonXP || 0) + amount;
    const newLevel = calculateLevel(newTotalXP);
    const leveledUp = newLevel > oldLevel;
    
    // Update user with new XP
    await User.findByIdAndUpdate(
      userObjectId,
      {
        $inc: {
          totalXP: amount,
          currentSeasonXP: amount,
        },
        $set: {
          level: newLevel,
          lastXPUpdate: new Date(),
        },
        $push: {
          xpHistory: {
            amount,
            action,
            timestamp: new Date(),
            metadata: {
              ...metadata,
              seasonNumber: season.seasonNumber,
              leveledUp,
              oldLevel,
              newLevel,
            },
          },
        },
      },
      { new: true }
    );
    
    // Update season stats
    await Season.findByIdAndUpdate(season._id, {
      $inc: {
        totalXPAwarded: amount,
      },
    });
    
    return {
      success: true,
      newLevel,
      leveledUp,
    };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get season leaderboard
export interface LeaderboardEntry {
  userId: string;
  username?: string;
  pfpUrl?: string;
  socialId?: string;
  socialPlatform?: string;
  currentSeasonXP: number;
  totalXP: number;
  level: number;
  rank: number;
}

export async function getSeasonLeaderboard(
  seasonNumber?: number,
  limit: number = 100,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  await dbConnect();
  
  let query: any = {};
  
  if (seasonNumber) {
    // Get leaderboard from SeasonLeaderboard (past seasons)
    const leaderboardEntries = await SeasonLeaderboard.find({ seasonNumber })
      .sort({ totalXP: -1 })
      .skip(offset)
      .limit(limit)
      .populate('user', 'username socialId socialPlatform level totalXP twitterProfile');
    
    return leaderboardEntries.map((entry, index) => ({
      userId: entry.user._id.toString(),
      username: (entry.user as any).twitterProfile?.username,
      pfpUrl: (entry.user as any).twitterProfile?.profileImageUrl,
      socialId: (entry.user as any).socialId,
      socialPlatform: (entry.user as any).socialPlatform,
      currentSeasonXP: entry.totalXP,
      totalXP: (entry.user as any).totalXP,
      level: entry.level,
      rank: entry.rank || offset + index + 1,
    }));
  } else {
    // Get current season leaderboard from User collection
    const users = await User.find({ currentSeasonXP: { $gt: 0 } })
      .sort({ currentSeasonXP: -1 })
      .skip(offset)
      .limit(limit)
      .select('username socialId socialPlatform currentSeasonXP totalXP level twitterProfile');
    
    return users.map((user, index) => ({
      userId: user._id.toString(),
      username: user.twitterProfile?.username || user.username,
      socialId: user.socialId,
      pfpUrl: user.twitterProfile?.profileImageUrl,
      socialPlatform: user.socialPlatform,
      currentSeasonXP: user.currentSeasonXP,
      totalXP: user.totalXP,
      level: user.level,
      rank: offset + index + 1,
    }));
  }
}

// Get all-time leaderboard (based on total XP)
export async function getAllTimeLeaderboard(
  limit: number = 100,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  await dbConnect();
  
  const users = await User.find({ totalXP: { $gt: 0 } })
    .sort({ totalXP: -1 })
    .skip(offset)
    .limit(limit)
    .select('username socialId socialPlatform currentSeasonXP totalXP level twitterProfile');
  
  return users.map((user, index) => ({
    userId: user._id.toString(),
    username: user.twitterProfile?.username || user.username,
    pfpUrl: user.twitterProfile?.profileImageUrl,
    socialId: user.socialId,
    socialPlatform: user.socialPlatform,
    currentSeasonXP: user.currentSeasonXP,
    totalXP: user.totalXP,
    level: user.level,
    rank: offset + index + 1,
  }));
}

// Get user's rank in current season
export async function getUserSeasonRank(userId: string | Types.ObjectId): Promise<number | null> {
  await dbConnect();
  
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  const user = await User.findById(userObjectId);
  if (!user) return null;
  
  const rank = await User.countDocuments({
    currentSeasonXP: { $gt: user.currentSeasonXP },
  });
  
  return rank + 1;
}

// Get user's all-time rank
export async function getUserAllTimeRank(userId: string | Types.ObjectId): Promise<number | null> {
  await dbConnect();
  
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  const user = await User.findById(userObjectId);
  if (!user) return null;
  
  const rank = await User.countDocuments({
    totalXP: { $gt: user.totalXP },
  });
  
  return rank + 1;
}

// Get user's XP stats
export interface UserXPStats {
  userId: string;
  totalXP: number;
  currentSeasonXP: number;
  level: number;
  xpToNextLevel: number;
  seasonRank: number | null;
  allTimeRank: number | null;
}

export async function getUserXPStats(userId: string | Types.ObjectId): Promise<UserXPStats | null> {
  await dbConnect();
  
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  const user = await User.findById(userObjectId);
  if (!user) return null;
  
  const [seasonRank, allTimeRank] = await Promise.all([
    getUserSeasonRank(userObjectId),
    getUserAllTimeRank(userObjectId),
  ]);
  
  return {
    userId: user._id.toString(),
    totalXP: user.totalXP || 0,
    currentSeasonXP: user.currentSeasonXP || 0,
    level: user.level || 1,
    xpToNextLevel: getXPToNextLevel(user.totalXP || 0),
    seasonRank,
    allTimeRank,
  };
}

// Reset season (called at end of season)
export async function resetSeason(): Promise<void> {
  await dbConnect();
  
  const currentSeason = await getCurrentSeason();
  if (!currentSeason) {
    throw new Error('No active season found');
  }
  
  // Archive current season leaderboard
  const topUsers = await User.find({ currentSeasonXP: { $gt: 0 } })
    .sort({ currentSeasonXP: -1 })
    .select('_id currentSeasonXP level');
  
  // Save to SeasonLeaderboard
  const leaderboardEntries = topUsers.map((user, index) => ({
    user: user._id,
    season: currentSeason._id,
    seasonNumber: currentSeason.seasonNumber,
    totalXP: user.currentSeasonXP,
    level: user.level,
    rank: index + 1,
  }));
  
  if (leaderboardEntries.length > 0) {
    await SeasonLeaderboard.insertMany(leaderboardEntries);
  }
  
  // Update season stats
  await Season.findByIdAndUpdate(currentSeason._id, {
    active: false,
    totalParticipants: topUsers.length,
  });
  
  // Reset all users' currentSeasonXP
  await User.updateMany(
    {},
    {
      $set: {
        currentSeasonXP: 0,
      },
    }
  );
  
  // Create next season
  const nextSeasonNumber = currentSeason.seasonNumber + 1;
  const nextSeasonStart = new Date(currentSeason.endDate);
  nextSeasonStart.setDate(nextSeasonStart.getDate() + 1);
  nextSeasonStart.setHours(0, 0, 0, 0);
  
  const nextSeasonEnd = new Date(nextSeasonStart);
  nextSeasonEnd.setMonth(nextSeasonEnd.getMonth() + 1);
  nextSeasonEnd.setDate(0); // Last day of the month
  nextSeasonEnd.setHours(23, 59, 59, 999);
  
  await Season.create({
    seasonNumber: nextSeasonNumber,
    startDate: nextSeasonStart,
    endDate: nextSeasonEnd,
    active: true,
    totalXPAwarded: 0,
    totalParticipants: 0,
  });
  
  console.log(`Season ${currentSeason.seasonNumber} ended. Season ${nextSeasonNumber} started.`);
}

// Check if two dates are the same UTC day (ignoring time)
export function isSameUTCDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

// Award daily login XP
export interface DailyLoginResult {
  awarded: boolean;
  xp?: number;
  nextRewardDate?: Date;
  alreadyClaimedToday?: boolean;
  error?: string;
}

export async function awardDailyLoginXP(
  userId: string | Types.ObjectId
): Promise<DailyLoginResult> {
  try {
    await dbConnect();
    
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    
    // Get user's current state
    const user = await User.findById(userObjectId);
    if (!user) {
      return { awarded: false, error: 'User not found' };
    }
    
    const now = new Date();
    
    // Check if user has already claimed today
    if (user.lastDailyLoginReward && isSameUTCDay(user.lastDailyLoginReward, now)) {
      // Already claimed today - calculate next reward date (tomorrow at 00:00 UTC)
      const nextReward = new Date(now);
      nextReward.setUTCDate(nextReward.getUTCDate() + 1);
      nextReward.setUTCHours(0, 0, 0, 0);
      
      return {
        awarded: false,
        alreadyClaimedToday: true,
        nextRewardDate: nextReward,
      };
    }
    
    // Award daily login XP
    const result = await awardXP({
      userId: userObjectId,
      amount: XP_REWARDS.DAILY_LOGIN,
      action: 'DAILY_LOGIN',
      metadata: {
        timestamp: now,
      },
    });
    
    if (!result.success) {
      return { awarded: false, error: result.error };
    }
    
    // Update lastDailyLoginReward
    await User.findByIdAndUpdate(userObjectId, {
      $set: {
        lastDailyLoginReward: now,
      },
    });
    
    // Calculate next reward date (tomorrow at 00:00 UTC)
    const nextReward = new Date(now);
    nextReward.setUTCDate(nextReward.getUTCDate() + 1);
    nextReward.setUTCHours(0, 0, 0, 0);
    
    return {
      awarded: true,
      xp: XP_REWARDS.DAILY_LOGIN,
      nextRewardDate: nextReward,
    };
  } catch (error) {
    console.error('Error awarding daily login XP:', error);
    return { awarded: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
