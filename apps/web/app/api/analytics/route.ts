import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';

export async function GET() {
  try {
    await dbConnect();

    const auctions = await Auction.find({});

    const totalAuctions = auctions.length;

    const auctionsWithBids = auctions.filter(auction => auction.bidders.length > 0).length;

    let totalEarnings = 0;
    auctions.forEach(auction => {
      if (auction.winningBid && auction.bidders.length > 0) {
        const winningBidder = auction.bidders.find(
          (bidder:any) => bidder.user.toString() === auction.winningBid?.toString()
        );
        if (winningBidder && winningBidder.usdcValue) {
          totalEarnings += winningBidder.usdcValue;
        }
      }
    });

    const uniqueBidders = new Set();
    auctions.forEach(auction => {
      auction.bidders.forEach((bidder:any) => {
        uniqueBidders.add(bidder.user.toString());
      });
    });

    return NextResponse.json({
      totalAuctions,
      auctionsWithBids,
      totalEarnings,
      uniqueBidders: uniqueBidders.size,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
