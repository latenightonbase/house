import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { verifyAccessToken } from '@/utils/privyAuth';

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    try {
      await verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    await dbConnect();

    // Get the wallet address from session or query params
    const { searchParams } = new URL(req.url);
    // @ts-ignore
    const walletAddress = searchParams.get('wallet') || session.wallet;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address not found' }, { status: 400 });
    }

    // Find user by wallet address
    const user = await User.findOne({ wallet: walletAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentDate = new Date();

    // Find all auctions hosted by this user
    const userAuctions = await Auction.find({
      hostedBy: user._id
    })
    .populate('hostedBy', 'wallet username')
    .sort({ createdAt: -1 }) // Sort by newest first
    .lean();

    // Calculate additional fields for each auction
    const auctionsWithStats = userAuctions.map(auction => {
      // Calculate highest bid
      const highestBid = auction.bidders.length > 0 
        ? Math.max(...auction.bidders.map((bidder: any) => bidder.bidAmount))
        : 0;

      // Calculate participant count
      const uniqueUsers = new Set(auction.bidders.map((bidder: any) => bidder.user.toString()));
      const participantCount = uniqueUsers.size;

      // Use status field from database
      const status = auction.status === 'ended' ? 'ended' : 'active';

      // Calculate time remaining (for active auctions) or time since end (for ended auctions)
      let timeInfo = '';
      if (status === 'active') {
        const timeRemaining = auction.endDate.getTime() - currentDate.getTime();
        const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
        timeInfo = `${hoursRemaining} hours remaining`;
      } else if (status === 'ended') {
        const timeSinceEnd = currentDate.getTime() - auction.endDate.getTime();
        const daysSinceEnd = Math.floor(timeSinceEnd / (1000 * 60 * 60 * 24));
        timeInfo = `Ended ${daysSinceEnd} day${daysSinceEnd !== 1 ? 's' : ''} ago`;
      }

      return {
        ...auction,
        highestBid,
        participantCount,
        bidCount: auction.bidders.length,
        status,
        timeInfo
      };
    });

    // Group auctions by status
    const groupedAuctions = {
      active: auctionsWithStats.filter(a => a.status === 'active'),
      upcoming: auctionsWithStats.filter(a => a.status === 'upcoming'),
      ended: auctionsWithStats.filter(a => a.status === 'ended')
    };

    return NextResponse.json({
      success: true,
      auctions: auctionsWithStats,
      grouped: groupedAuctions,
      total: auctionsWithStats.length,
      counts: {
        active: groupedAuctions.active.length,
        upcoming: groupedAuctions.upcoming.length,
        ended: groupedAuctions.ended.length
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching user auctions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to fetch your auctions'
      }, 
      { status: 500 }
    );
  }
}