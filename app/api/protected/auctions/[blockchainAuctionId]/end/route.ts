import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction, { IBidder } from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { authOptions } from '@/utils/auth';
import { ethers } from 'ethers';
import { fetchTokenPrice, calculateUSDValue } from '@/utils/tokenPrice';
import { verifyAccessToken } from '@/utils/privyAuth';

export async function POST(req: NextRequest) {
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
    const walletAddress = req.headers.get('x-user-wallet');

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
      
      // Fetch token price for USD conversion
      let tokenPriceUSD = 0;
      try {
        if (!isUSDC) {
          // Only fetch price for non-USDC tokens (USDC price is always $1)
          tokenPriceUSD = await fetchTokenPrice(auction.tokenAddress);
          console.log(`Token price for ${auction.tokenAddress}: $${tokenPriceUSD}`);
        } else {
          tokenPriceUSD = 1; // USDC is always $1
        }
      } catch (error) {
        console.error('Error fetching token price:', error);
        // Continue without USD value if price fetch fails
        tokenPriceUSD = 0;
      }
      
      // Create sub array to track all bids
      const allBids = [];
      
      // Process each bidder from contract
      for (const contractBidder of contractBidders) {

        console.log("BIDDER",contractBidder)
        // Find or create user for each bidder
        let bidderUser = await User.findOne({ wallet: contractBidder.bidder });
        
        if (!bidderUser) {
          // Create a new user if they don't exist
          bidderUser = new User({
            wallet: contractBidder.bidder,
            username: `User_${contractBidder.bidder.slice(-6)}`, // Generate a default username
            fid: contractBidder.fid || null
          });
          await bidderUser.save();
        }

        console.log("BIG NUMBER",contractBidder.bidAmount)
        console.log("NORMAL",ethers.formatUnits(contractBidder.bidAmount, decimals))

        const formattedBidAmount = Number(ethers.formatUnits(contractBidder.bidAmount, decimals));
        
        // Calculate USD value
        let usdValue = null;
        if (tokenPriceUSD > 0) {
          usdValue = calculateUSDValue(formattedBidAmount, tokenPriceUSD);
          console.log(`Bid amount: ${formattedBidAmount}, USD value: $${usdValue}`);
        }

        const bidData = {
          user: bidderUser._id,
          bidAmount: formattedBidAmount,
          usdcValue: usdValue,
          bidTimestamp: new Date() // Use current time since we don't have exact timestamp from contract
        };

        // Add to both arrays
        auction.bidders.push(bidData as IBidder);
        allBids.push({ ...bidData, bidderUser });
      }

      // Find bid with highest usdValue and set winningBid
      if (allBids.length > 0) {
        const highestBid = allBids.reduce((prev, current) => {
          return (current.usdcValue || 0) > (prev.usdcValue || 0) ? current : prev;
        });
        
        auction.winningBid = highestBid.bidderUser._id;
        
        // Update the winner's bidsWon field
        await User.findByIdAndUpdate(
          highestBid.bidderUser._id,
          { $addToSet: { bidsWon: auction._id } }
        );
      } else {
        auction.winningBid = 'no_bids';
      }
    } else {
      auction.winningBid = 'no_bids';
    }

    // End the auction by setting the end date to now and status to ended
    auction.endDate = currentDate;
    auction.status = 'ended';
    await auction.save();

    // Trigger fee distribution in the background (true fire-and-forget)
    // This runs server-side so it continues even if client disconnects
    if (auction.tokenAddress) {
      console.log('🔄 Initiating server-side fee distribution for token:', auction.tokenAddress);
      
      // Create the fee distribution request
      const feeDistributionPayload = {
        token: auction.tokenAddress
      };

      // True fire-and-forget: no await, no promise chaining
      // This will not block the response and runs completely independently
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/handleFeeDistribution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feeDistributionPayload)
      }).catch(error => {
        // Only catch to prevent unhandled rejection warnings
        console.error('❌ Fee distribution request failed to initiate:', error);
      });
      
      console.log('ℹ️ Fee distribution initiated in background (35-40s expected)');
    } else {
      console.log('ℹ️ No token address found, skipping fee distribution');
    }

    return NextResponse.json({
      success: true,
      message: 'Auction ended successfully',
      tokenAddress: auction.tokenAddress, // Include for client logging
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