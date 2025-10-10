import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/utils/db';
import Auction, { IBidder } from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract blockchainAuctionId from the URL
    const blockchainAuctionId = req.nextUrl.pathname.split('/')[4];
    
    if (!blockchainAuctionId) {
      return NextResponse.json({ error: 'Auction ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Find the auction
    const auction = await Auction.findOne({ blockchainAuctionId });
    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Get the wallet address from session
    // @ts-ignore
    const walletAddress = session.wallet;
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address not found in session' }, { status: 400 });
    }

    // Find the user to verify ownership
    const user = await User.findOne({ wallet: walletAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the user is the host of the auction
    if (auction.hostedBy.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only the auction host can end the auction' }, { status: 403 });
    }

    // Check if auction is currently active
    const currentDate = new Date();
    if (currentDate < auction.startDate) {
      return NextResponse.json({ error: 'Cannot end an auction that hasn\'t started yet' }, { status: 400 });
    }

    if (currentDate > auction.endDate) {
      return NextResponse.json({ error: 'Auction has already ended' }, { status: 400 });
    }

    // End the auction by setting the end date to now
    auction.endDate = currentDate;
    await auction.save();

    // Calculate the winning bid and final stats
    let winnerInfo = null;
    if (auction.bidders.length > 0) {
      const highestBid = Math.max(...auction.bidders.map((bidder: IBidder) => bidder.bidAmount));
      const winningBidder = auction.bidders.find((bidder: IBidder) => bidder.bidAmount === highestBid);
      
      if (winningBidder) {
        const winnerUser = await User.findById(winningBidder.user);
        winnerInfo = {
          amount: highestBid,
          currency: auction.currency,
          winner: {
            wallet: winnerUser?.wallet,
            username: winnerUser?.username
          }
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Auction ended successfully',
      auction: {
        id: auction._id,
        blockchainAuctionId: auction.blockchainAuctionId,
        auctionName: auction.auctionName,
        endedAt: auction.endDate,
        totalBids: auction.bidders.length,
        participantCount: new Set(auction.bidders.map((bidder: IBidder) => bidder.user.toString())).size,
        winningBid: winnerInfo
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error ending auction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to end auction'
      }, 
      { status: 500 }
    );
  }
}