import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import WeeklyBidderLeaderboard from '@/utils/schemas/WeeklyBidderLeaderboard';
import User from '@/utils/schemas/User';
import { getPrivyUser } from '@/lib/privy-server';

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the leaderboard entry ID from request body
    const body = await req.json();
    const { entryId } = body;

    if (!entryId) {
      return NextResponse.json({ error: 'Missing entryId' }, { status: 400 });
    }

    // Find the entry
    const entry = await WeeklyBidderLeaderboard.findById(entryId);
    
    if (!entry) {
      return NextResponse.json({ error: 'Leaderboard entry not found' }, { status: 404 });
    }

    // Verify the entry belongs to this user
    if (entry.user.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized to claim this reward' }, { status: 403 });
    }

    // Check if already claimed
    if (entry.claimed) {
      return NextResponse.json({ error: 'Reward already claimed' }, { status: 400 });
    }

    // Check if the week has ended
    const now = new Date();
    if (now < entry.weekEndDate) {
      return NextResponse.json({ 
        error: 'Cannot claim reward before the week ends' 
      }, { status: 400 });
    }

    // Calculate reward amount if not already set
    // TODO: Implement your reward calculation logic here
    // For now, we'll use a simple formula: top performers get rewards
    if (entry.rewardAmount === 0) {
      // Fetch all entries for this week to determine ranking
      const allEntries = await WeeklyBidderLeaderboard.find({
        weekStartDate: entry.weekStartDate,
      }).sort({ totalSpentUSD: -1 });

      const rank = allEntries.findIndex(e => e._id.toString() === entry._id.toString()) + 1;
      
      // Reward calculation: Top 10 get rewards
      if (rank === 1) {
        entry.rewardAmount = 100; // $100 for 1st place
      } else if (rank === 2) {
        entry.rewardAmount = 50; // $50 for 2nd place
      } else if (rank === 3) {
        entry.rewardAmount = 25; // $25 for 3rd place
      } else if (rank <= 10) {
        entry.rewardAmount = 10; // $10 for top 10
      } else {
        return NextResponse.json({ 
          error: 'Not eligible for rewards this week' 
        }, { status: 400 });
      }
    }

    // Mark as claimed
    entry.claimed = true;
    await entry.save();

    console.log(`✅ User ${user.wallet} claimed reward of $${entry.rewardAmount} for week ${entry.weekStartDate}`);

    // TODO: Implement actual reward distribution (e.g., transfer tokens, update balance, etc.)
    // This could involve:
    // - Updating a user balance in the database
    // - Triggering an on-chain token transfer
    // - Creating a withdrawal record
    // - Sending a notification

    return NextResponse.json({
      success: true,
      message: 'Reward claimed successfully',
      rewardAmount: entry.rewardAmount,
      entry: {
        _id: entry._id,
        weekStartDate: entry.weekStartDate,
        weekEndDate: entry.weekEndDate,
        totalSpentUSD: entry.totalSpentUSD,
        bidCount: entry.bidCount,
        claimed: entry.claimed,
        rewardAmount: entry.rewardAmount,
      }
    });

  } catch (error) {
    console.error('Error claiming reward:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to claim reward' },
      { status: 500 }
    );
  }
}
