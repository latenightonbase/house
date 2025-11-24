import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import WeeklyBidderLeaderboard from '@/utils/schemas/WeeklyBidderLeaderboard';
import User from '@/utils/schemas/User';
import { getPrivyUser } from '@/lib/privy-server';
import { formatWeekRange } from '@/utils/weekHelpers';

export async function GET(req: NextRequest) {
  try {
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verifiedClaims = await getPrivyUser(authToken);
    
    if (!verifiedClaims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find user by Privy ID
    const user = await User.findOne({ privyId: verifiedClaims.userId });
    if (!user) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Find user
    const user = await User.findOne({ wallet: userWallet });
    if (!user) {
      return NextResponse.json({ success: true, data: [] });
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
