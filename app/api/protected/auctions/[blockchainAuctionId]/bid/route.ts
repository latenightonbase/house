import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction, { IBidder } from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  try {
    // Check for authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blockchainAuctionId = req.nextUrl.pathname.split('/')[4];

    console.log("Placing bid on auction ID:", blockchainAuctionId);

    const body = await req.json();
    const { bidAmount, userWallet } = body;

    // Validate required fields
    if (!bidAmount || !userWallet) {
      return NextResponse.json({ error: 'Missing required fields: bidAmount and userWallet' }, { status: 400 });
    }

    if (typeof bidAmount !== 'number' || bidAmount <= 0) {
      return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 });
    }

    await dbConnect();

    // Find the auction by blockchainAuctionId
    const auction = await Auction.findOne({ blockchainAuctionId });
    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Check if auction is active
    const now = new Date();
    
    if (now > auction.endDate) {
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 });
    }

    // Find or create the user
    let user = await User.findOne({ wallet: userWallet.toLowerCase() });
    if (!user) {
      user = new User({
        wallet: userWallet.toLowerCase(),
        participatedAuctions: []
      });
      await user.save();
    }

    // Validate bid amount against minimum bid and existing highest bid
    if (bidAmount < auction.minimumBid) {
      return NextResponse.json({ 
        error: `Bid amount must be at least ${auction.minimumBid} ${auction.currency}` 
      }, { status: 400 });
    }

    // Check if there's a higher bid
    const currentHighestBid = auction.bidders.length > 0 
      ? Math.max(...auction.bidders.map((bidder: IBidder) => bidder.bidAmount))
      : 0;

    if (bidAmount <= currentHighestBid) {
      return NextResponse.json({ 
        error: `Bid amount must be higher than the current highest bid of ${currentHighestBid} ${auction.currency}` 
      }, { status: 400 });
    }

    // Add the bid to the auction
    auction.bidders.push({
      user: user._id,
      bidAmount,
      bidTimestamp: new Date()
    });

    await auction.save();

    // Add auction to user's participated auctions if not already there
    if (!user.participatedAuctions.includes(auction._id)) {
      user.participatedAuctions.push(auction._id);
      await user.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Bid placed successfully',
      bid: {
        amount: bidAmount,
        currency: auction.currency,
        timestamp: new Date(),
        auctionId: auction._id
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error placing bid:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}