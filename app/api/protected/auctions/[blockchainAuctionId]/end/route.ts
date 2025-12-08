import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction, { IBidder } from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { authOptions } from '@/utils/auth';
import { ethers } from 'ethers';
import { fetchTokenPrice, calculateUSDValue } from '@/utils/tokenPrice';
import { authenticateRequest } from '@/utils/authService';
import { sendNotification } from '@/utils/notification/sendNotification';

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      console.error('❌ [AUTH] Authentication failed');
      return authResult.response;
    }

    // Extract blockchainAuctionId from the URL
    const blockchainAuctionId = req.nextUrl.pathname.split('/')[4];
    
    if (!blockchainAuctionId) {
      console.error('❌ [AUCTION ID] Missing blockchain auction ID');
      return NextResponse.json({ error: 'Auction ID is required' }, { status: 400 });
    }

    // Parse request body to get bidders data from contract
    const body = await req.json();
    const { bidders: contractBidders } = body;

    await dbConnect();

    // Find the auction
    const auction = await Auction.findOne({ blockchainAuctionId });
    if (!auction) {
      console.error('❌ [AUCTION LOOKUP] Auction not found in database');
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Get the wallet address from session
    // @ts-ignore
    const socialId = req.headers.get('x-user-wallet');

    if (!socialId) {
      console.error('❌ [WALLET] Wallet address not found in request headers');
      return NextResponse.json({ error: 'Wallet address not found in session' }, { status: 400 });
    }

    // Find the user to verify ownership
    const user = await User.findOne({ socialId: socialId });
    if (!user) {
      console.error('❌ [USER LOOKUP] User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the user is the host of the auction
    if (auction.hostedBy.toString() !== user._id.toString()) {
      console.error('❌ [OWNERSHIP] User is not the auction host');
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
      
      // Fetch token price for USD conversion
      let tokenPriceUSD = 0;
      try {
        if (!isUSDC) {
          // Only fetch price for non-USDC tokens (USDC price is always $1)
          tokenPriceUSD = await fetchTokenPrice(auction.tokenAddress);
        } else {
          tokenPriceUSD = 1; // USDC is always $1
        }
      } catch (error) {
        console.error('❌ [PRICE] Error fetching token price:', error);
        // Continue without USD value if price fetch fails
        tokenPriceUSD = 0;
      }
      
      // Create sub array to track all bids
      const allBids = [];
      
      // Process each bidder from contract
      for (let i = 0; i < contractBidders.length; i++) {
        const contractBidder = contractBidders[i];
        
        // Find or create user for each bidder
        let bidderUser = await User.findOne({ socialId: contractBidder.fid });
        
        if (!bidderUser) {
          return NextResponse.json(
            { error: `Bidder with FID ${contractBidder.fid} not found` },
            { status: 404 }
          );
        }

        const formattedString = contractBidder.bidAmount;

        const formattedBidAmount = Number(formattedString);
        
        // Calculate USD value
        let usdValue = null;
        if (tokenPriceUSD > 0) {
          usdValue = calculateUSDValue(formattedBidAmount, tokenPriceUSD);
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

        const {token, url} = highestBid.bidderUser.notificationDetails || {};

        if(token && url){
          // Send notification to winner
          const notificationTitle = `🎉 You won the auction for ${auction.title}!`;
          const notificationBody = `Congratulations! You are the highest bidder with a bid of ${ethers.formatUnits(highestBid.bidAmount, isUSDC ? 6 : 18)} ${auction.tokenSymbol || 'TOKEN'}. Click to view the auction.`;
          const targetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/bid/${auction.blockchainAuctionId}`;

          await sendNotification(url, token, notificationTitle, notificationBody, targetUrl);
        }

      } else {
        auction.winningBid = 'no_bids';
      }
    } else {
      auction.winningBid = 'no_bids';
    }


    auction.endDate = currentDate;

    auction.status = 'ended';
    await auction.save();


    
    // Trigger fee distribution in the background (true fire-and-forget)
    // This runs server-side so it continues even if client disconnects

    if (auction.tokenAddress) {
      
      // Create the fee distribution request
      const feeDistributionPayload = {
        token: auction.tokenAddress
      };
      
      const feeDistributionUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/handleFeeDistribution`;

      fetch(feeDistributionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feeDistributionPayload)
      }).catch(error => {
        // Only catch to prevent unhandled rejection warnings
        console.error('❌ [FEE DISTRIBUTION] Request failed to initiate:', error);
        console.error('❌ [FEE DISTRIBUTION] Error details:', error.message);
      });
      
    } 
    const response = {
      success: true,
      message: 'Auction ended successfully',
      tokenAddress: auction.tokenAddress,
    };
   
    return NextResponse.json(response, { status: 200 });

  } catch (error:any) {
    console.error('\n❌ [ERROR] Critical error ending auction');
    console.error('❌ [ERROR] Error type:', error?.constructor?.name);
    console.error('❌ [ERROR] Error message:', error?.message);
    console.error('❌ [ERROR] Full error:', error);
    console.error('❌ [ERROR] Stack trace:', error?.stack);

    const errorResponse = { 
      success: false, 
      error: 'Internal server error',
      message: 'Failed to end auction'
    };
    console.log('📤 [ERROR RESPONSE] Response data:', JSON.stringify(errorResponse, null, 2));
    console.log('📤 [ERROR RESPONSE] Status code: 500');
    return NextResponse.json(
      errorResponse, 
      { status: 500 }
    );
  }
}