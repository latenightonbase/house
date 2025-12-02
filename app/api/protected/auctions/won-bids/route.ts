import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { authOptions } from '@/utils/auth';
import { authenticateRequest } from '@/utils/authService';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get wallet address from query params
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    await dbConnect();

    // Find the user
    const user = await User.findOne({ wallet });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find all auctions where this user is the winner
    const wonAuctions = await Auction.find({
      winningBid: user._id,
      endDate: { $lt: new Date() } // Only ended auctions
    })
    .populate('hostedBy', 'wallet username')
    .sort({ endDate: -1 }); // Most recent first

    // Format the auctions data
    const formattedAuctions = wonAuctions.map(auction => {
      const now = new Date();
      const endDate = new Date(auction.endDate);
      const startDate = new Date(auction.startDate);
      
      // Get highest bid and participant count
      const highestBid = auction.bidders.length > 0 
        ? Math.max(...auction.bidders.map((bidder: any) => bidder.bidAmount))
        : 0;
      
      const uniqueParticipants = new Set(auction.bidders.map((bidder: any) => bidder.user.toString()));
      const participantCount = uniqueParticipants.size;
      
      const bidCount = auction.bidders.length;

      return {
        _id: auction._id,
        auctionName: auction.auctionName,
        endDate: auction.endDate,
        startDate: auction.startDate,
        currency: auction.currency,
        minimumBid: auction.minimumBid,
        blockchainAuctionId: auction.blockchainAuctionId,
        tokenAddress: auction.tokenAddress,
        hostedBy: auction.hostedBy,
        highestBid,
        participantCount,
        bidCount,
        timeInfo: `Ended ${endDate.toLocaleDateString()}`
      };
    });

    return NextResponse.json({
      success: true,
      auctions: formattedAuctions,
      total: formattedAuctions.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching won auctions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to fetch won auctions'
      }, 
      { status: 500 }
    );
  }
}