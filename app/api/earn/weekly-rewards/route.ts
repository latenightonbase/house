import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import WeeklyBidderLeaderboard from '@/utils/schemas/WeeklyBidderLeaderboard';
import User from '@/utils/schemas/User';
import { formatWeekRange } from '@/utils/weekHelpers';
import { verifyAccessToken } from '@/utils/privyAuth';

export async function GET(req:any) {
  try {
    // Check for authentication
    const authHeader = req.headers.get('authorization');
            const token = authHeader?.replace('Bearer ', '');
        
            if (!token) {
              console.log("❌ Authentication failed - no token");
              return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
            }
        
            try {
              const claims = await verifyAccessToken(token);
              console.log("✅ Authentication successful:", claims.userId);
            } catch (error) {
              console.log("❌ Authentication failed - invalid token");
              return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
            }
    await connectDB();

    // Get user wallet from session
    const userWallet = req.headers.get('x-user-wallet');
    if (!userWallet) {
      return NextResponse.json({ error: 'User wallet not found in session' }, { status: 400 });
    }

    const user = await User.findOne({ wallet: userWallet });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all weekly entries for this user, ordered by week (newest first)
    const weeklyRewards = await WeeklyBidderLeaderboard.find({
      user: user._id,
    })
      .sort({ weekStartDate: -1 })
      .lean();

    console.log('Fetched weekly rewards for user:', user._id, 'Count:', weeklyRewards.length);

    // Format the data for display
    const formattedRewards = weeklyRewards.map((entry: any) => ({
      _id: entry._id.toString(),
      weekStartDate: entry.weekStartDate,
      weekEndDate: entry.weekEndDate,
      weekLabel: formatWeekRange(new Date(entry.weekStartDate), new Date(entry.weekEndDate)),
      totalSpentUSD: entry.totalSpentUSD,
      bidCount: entry.bidCount,
      claimed: entry.claimed,
      rewardAmount: entry.rewardAmount,
    }));

    return NextResponse.json({
      success: true,
      data: formattedRewards,
    });
  } catch (error) {
    console.error('Error fetching weekly rewards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weekly rewards' },
      { status: 500 }
    );
  }
}
