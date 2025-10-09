import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const currentDate = new Date();

    // Find auctions that are currently running (started but not ended)
    const runningAuctions = await Auction.find({
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate }
    })
    .populate('hostedBy', 'wallet username blockchainAuctionId') // Populate host information
    .lean(); // Use lean for better performance

    // Calculate additional fields for each auction
    const auctionsWithStats = runningAuctions.map(auction => {
      // Calculate highest bid
      const highestBid = auction.bidders.length > 0 
        ? Math.max(...auction.bidders.map((bidder: any) => bidder.bidAmount))
        : 0;

      // Calculate participant count
      const uniqueUsers = new Set(auction.bidders.map((bidder: any) => bidder.user.toString()));
      const participantCount = uniqueUsers.size;

      // Calculate time remaining
      const timeRemaining = auction.endDate.getTime() - currentDate.getTime();
      const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));

      return {
        ...auction,
        highestBid,
        participantCount,
        hoursRemaining,
        bidCount: auction.bidders.length
      };
    });

    // Sort by highest bid first, then by participant count, then by bid count
    const topFiveAuctions = auctionsWithStats
      .sort((a, b) => {
        // Primary sort: highest bid
        if (b.highestBid !== a.highestBid) {
          return b.highestBid - a.highestBid;
        }
        // Secondary sort: participant count
        if (b.participantCount !== a.participantCount) {
          return b.participantCount - a.participantCount;
        }
        // Tertiary sort: bid count
        return b.bidCount - a.bidCount;
      })
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      auctions: topFiveAuctions,
      total: topFiveAuctions.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching top 5 running auctions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to fetch running auctions'
      }, 
      { status: 500 }
    );
  }
}
