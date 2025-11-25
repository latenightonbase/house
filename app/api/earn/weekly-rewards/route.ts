import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import WeeklyBidderLeaderboard from '@/utils/schemas/WeeklyBidderLeaderboard';
import User from '@/utils/schemas/User';
import { getServerSession } from 'next-auth';
import { formatWeekRange } from '@/utils/weekHelpers';

export async function GET() {
  try {
    // Check for authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get user wallet from session
    const userWallet = (session as any).user?.name;
    if (!userWallet) {
      return NextResponse.json({ error: 'User wallet not found in session' }, { status: 400 });
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
