import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/utils/db';
import Auction, { IBidder } from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { authOptions } from '@/utils/auth';
import { ethers } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated with NextAuth configuration
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract blockchainAuctionId from the URL
    const blockchainAuctionId = req.nextUrl.pathname.split('/')[4];

    console.log('Ending auction with ID:', blockchainAuctionId);
    
    if (!blockchainAuctionId) {
      return NextResponse.json({ error: 'Auction ID is required' }, { status: 400 });
    }

    // Parse request body to get bidders data from contract
    const body = await req.json();
    const { bidders: contractBidders } = body;

    await dbConnect();

    // Find the auction
    const auction = await Auction.findOne({ blockchainAuctionId });
    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Get the wallet address from session
    // @ts-ignore
    const walletAddress = session.wallet;

    console.log(session)

    console.log('Authenticated wallet:', walletAddress);

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

    // Update auction with bidders data from contract
    if (contractBidders && contractBidders.length > 0) {
      // Clear existing bidders array
      auction.bidders = [];
      
      // Determine decimal places based on token address
      const isUSDC = auction.tokenAddress?.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
      const decimals = isUSDC ? 6 : 18;
      
      // Process each bidder from contract
      for (const contractBidder of contractBidders) {

        console.log("BIDDER",contractBidder)
        // Find or create user for each bidder
        let bidderUser = await User.findOne({ wallet: contractBidder.bidder.toLowerCase() });
        
        if (!bidderUser) {
          // Create a new user if they don't exist
          bidderUser = new User({
            wallet: contractBidder.bidder.toLowerCase(),
            username: `User_${contractBidder.bidder.slice(-6)}`, // Generate a default username
            fid: contractBidder.fid || null
          });
          await bidderUser.save();
        }

        console.log("BIG NUMBER",contractBidder.bidAmount)
        console.log("NORMAL",ethers.utils.formatUnits(contractBidder.bidAmount, decimals))


        const formattedBidAmount = Number(ethers.utils.formatUnits(contractBidder.bidAmount, decimals));

        // Add bidder to auction
        auction.bidders.push({
          user: bidderUser._id,
          bidAmount: formattedBidAmount,
          bidTimestamp: new Date() // Use current time since we don't have exact timestamp from contract
        } as IBidder);
      }
    }

    // End the auction by setting the end date to now
    auction.endDate = currentDate;
    await auction.save();

    return NextResponse.json({
      success: true,
      message: 'Auction ended successfully',
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