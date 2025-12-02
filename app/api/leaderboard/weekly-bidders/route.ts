import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import WeeklyBidderLeaderboard from '@/utils/schemas/WeeklyBidderLeaderboard';
import User from '@/utils/schemas/User';
import { getWeekBoundaries } from '@/utils/weekHelpers';

export async function GET() {
  try {
    await connectDB();

    const { weekStartDate, weekEndDate } = getWeekBoundaries();

    console.log('Fetching weekly bidders for:', { weekStartDate, weekEndDate });

    // Get top bidders for the current week
    const weeklyBidders = await WeeklyBidderLeaderboard.find({
      weekStartDate,
      totalSpentUSD: { $gte: 10 }, // Only include bids >= $10
    })
      .sort({ totalSpentUSD: -1 })
      .limit(20)
      .populate('user', 'wallet username fid twitterProfile')
      .lean();

    console.log('Fetched weekly bidders:', weeklyBidders.length);

    // Collect unique FIDs that are valid
    const uniqueFids = new Set<string>();
    weeklyBidders.forEach(entry => {
      const user = entry.user as any;
      if (user.socialId && user.socialId !== '' && user.socialPlatform !== "TWITTER") {
        uniqueFids.add(user.socialId);
      }
    });

    // Fetch display names from Neynar API for valid FIDs
    let neynarUsers: Record<string, any> = {};
    if (uniqueFids.size > 0) {
      try {
        const fidsArray = Array.from(uniqueFids);
        const res = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidsArray.join(',')}`,
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY as string,
            },
          }
        );
        
        if (res.ok) {
          const jsonRes = await res.json();
          if (jsonRes.users) {
            jsonRes.users.forEach((user: any) => {
              neynarUsers[user.fid] = user;
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user data from Neynar:', error);
      }
    }

    // Enhance entries with Neynar data
    const enhancedBidders = weeklyBidders.map((entry, index) => {
      const user = entry.user as any;
      const entryData = entry as any;
      let enhancedEntry: any = { 
        ...entry,
        _id: entryData._id?.toString() || `${user._id}-${entry.weekStartDate}`,
        userId: user._id,
        wallet: user.wallet,
        username: user.username,
        socialId: user.socialId,
      };
      
      if (user.socialId && user.socialId !== '' && user.socialPlatform !== "TWITTER") {
        // For valid FIDs, use data from Neynar API
        const neynarUser = neynarUsers[user.socialId];
        const fallbackWallet = user.wallet;
        const truncatedWallet = fallbackWallet ? `${fallbackWallet.slice(0, 6)}...${fallbackWallet.slice(-4)}` : fallbackWallet;
        
        enhancedEntry.username = neynarUser?.username || user.username || truncatedWallet;
        enhancedEntry.display_name = neynarUser?.display_name || null;
        enhancedEntry.pfp_url = neynarUser?.pfp_url || user.twitterProfile?.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${fallbackWallet}`;
      } else if (user.twitterProfile?.username) {
        // No valid FID, use Twitter profile
        enhancedEntry.username = user.twitterProfile.username;
        enhancedEntry.display_name = user.twitterProfile.name || null;
        enhancedEntry.pfp_url = user.twitterProfile.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${user.wallet}`;
      } else {
        // No FID or Twitter profile, use wallet
        const wallet = user.wallet;
        enhancedEntry.username = user.username || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet);
        enhancedEntry.display_name = null;
        enhancedEntry.pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${wallet}`;
      }

      return enhancedEntry;
    });

    return NextResponse.json({
      success: true,
      data: enhancedBidders,
      weekStartDate,
      weekEndDate,
    });
  } catch (error) {
    console.error('Error fetching weekly bidders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weekly leaderboard data' },
      { status: 500 }
    );
  }
}
