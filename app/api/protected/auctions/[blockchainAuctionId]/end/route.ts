import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction, { IBidder } from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { authOptions } from '@/utils/auth';
import { ethers } from 'ethers';
import { fetchTokenPrice, calculateUSDValue } from '@/utils/tokenPrice';
import { authenticateRequest } from '@/utils/authService';

export async function POST(req: NextRequest) {
  console.log('📍 [END AUCTION] Request initiated');
  console.log('📍 [END AUCTION] Request URL:', req.nextUrl.pathname);
  console.log('📍 [END AUCTION] Request method:', req.method);
  
  try {
    console.log('🔐 [AUTH] Starting authentication...');
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      console.error('❌ [AUTH] Authentication failed');
      return authResult.response;
    }
    console.log('✅ [AUTH] Authentication successful');

    // Extract blockchainAuctionId from the URL
    const blockchainAuctionId = req.nextUrl.pathname.split('/')[4];

    console.log('🎯 [AUCTION ID] Extracted from URL:', blockchainAuctionId);
    console.log('🎯 [AUCTION ID] URL pathname:', req.nextUrl.pathname);
    
    if (!blockchainAuctionId) {
      console.error('❌ [AUCTION ID] Missing blockchain auction ID');
      return NextResponse.json({ error: 'Auction ID is required' }, { status: 400 });
    }
    
    console.log('✅ [AUCTION ID] Validation passed');

    // Parse request body to get bidders data from contract
    console.log('📦 [REQUEST BODY] Parsing request body...');
    const body = await req.json();
    const { bidders: contractBidders } = body;
    console.log('📦 [REQUEST BODY] Body parsed successfully');
    console.log('📦 [REQUEST BODY] Number of contract bidders:', contractBidders?.length || 0);
    console.log('📦 [REQUEST BODY] Full body:', JSON.stringify(body, null, 2));

    console.log('🔌 [DATABASE] Connecting to database...');
    await dbConnect();
    console.log('✅ [DATABASE] Connected successfully');

    // Find the auction
    console.log('🔍 [AUCTION LOOKUP] Searching for auction with blockchainAuctionId:', blockchainAuctionId);
    const auction = await Auction.findOne({ blockchainAuctionId });
    if (!auction) {
      console.error('❌ [AUCTION LOOKUP] Auction not found in database');
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }
    console.log('✅ [AUCTION LOOKUP] Auction found');
    console.log('📊 [AUCTION INFO] Auction ID:', auction._id);
    console.log('📊 [AUCTION INFO] Hosted by:', auction.hostedBy);
    console.log('📊 [AUCTION INFO] Current status:', auction.status);
    console.log('📊 [AUCTION INFO] Token address:', auction.tokenAddress);
    console.log('📊 [AUCTION INFO] Current bidders count:', auction.bidders?.length || 0);

    // Get the wallet address from session
    console.log('👛 [WALLET] Extracting wallet address from headers...');
    // @ts-ignore
    const socialId = req.headers.get('x-user-wallet');

    console.log('👛 [WALLET] Authenticated wallet:', socialId);

    if (!socialId) {
      console.error('❌ [WALLET] Wallet address not found in request headers');
      return NextResponse.json({ error: 'Wallet address not found in session' }, { status: 400 });
    }
    console.log('✅ [WALLET] Wallet address extracted successfully');

    // Find the user to verify ownership
    console.log('👤 [USER LOOKUP] Searching for user with wallet:', socialId);
    const user = await User.findOne({ socialId: socialId });
    if (!user) {
      console.error('❌ [USER LOOKUP] User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.log('✅ [USER LOOKUP] User found');
    console.log('👤 [USER INFO] User ID:', user._id);
    console.log('👤 [USER INFO] Username:', user.username);

    // Check if the user is the host of the auction
    console.log('🔒 [OWNERSHIP] Verifying auction ownership...');
    console.log('🔒 [OWNERSHIP] Auction hostedBy:', auction.hostedBy.toString());
    console.log('🔒 [OWNERSHIP] User ID:', user._id.toString());
    if (auction.hostedBy.toString() !== user._id.toString()) {
      console.error('❌ [OWNERSHIP] User is not the auction host');
      return NextResponse.json({ error: 'Only the auction host can end the auction' }, { status: 403 });
    }
    console.log('✅ [OWNERSHIP] User is verified as auction host');

    // Check if auction is currently active
    const currentDate = new Date();
    console.log('⏰ [TIMING] Current date:', currentDate.toISOString());
    console.log('⏰ [TIMING] Auction end date:', auction.endDate?.toISOString());

    // Update auction with bidders data from contract
    console.log('💰 [BIDDERS] Processing contract bidders...');
    console.log('💰 [BIDDERS] Contract bidders count:', contractBidders?.length || 0);
    if (contractBidders && contractBidders.length > 0) {
      console.log('💰 [BIDDERS] Clearing existing bidders array...');
      console.log('💰 [BIDDERS] Previous bidders count:', auction.bidders?.length || 0);
      // Clear existing bidders array
      auction.bidders = [];
      
      // Determine decimal places based on token address
      console.log('🪙 [TOKEN] Token address:', auction.tokenAddress);
      const isUSDC = auction.tokenAddress?.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
      
      // Fetch token price for USD conversion
      let tokenPriceUSD = 0;
      console.log('💵 [PRICE] Fetching token price...');
      try {
        if (!isUSDC) {
          // Only fetch price for non-USDC tokens (USDC price is always $1)
          console.log('💵 [PRICE] Fetching price for non-USDC token...');
          tokenPriceUSD = await fetchTokenPrice(auction.tokenAddress);
          console.log(`✅ [PRICE] Token price for ${auction.tokenAddress}: $${tokenPriceUSD}`);
        } else {
          tokenPriceUSD = 1; // USDC is always $1
          console.log('💵 [PRICE] USDC token, using price: $1');
        }
      } catch (error) {
        console.error('❌ [PRICE] Error fetching token price:', error);
        // Continue without USD value if price fetch fails
        tokenPriceUSD = 0;
      }
      console.log('💵 [PRICE] Final token price USD:', tokenPriceUSD);
      
      // Create sub array to track all bids
      const allBids = [];
      console.log('🔄 [PROCESSING] Starting to process each bidder...');
      
      // Process each bidder from contract
      for (let i = 0; i < contractBidders.length; i++) {
        const contractBidder = contractBidders[i];
        console.log(`\n👤 [BIDDER ${i + 1}/${contractBidders.length}] Processing bidder...`);
        console.log(`👤 [BIDDER ${i + 1}] Wallet:`, contractBidder.bidder);
        console.log(`👤 [BIDDER ${i + 1}] Raw bid amount:`, contractBidder.bidAmount);
        console.log(`👤 [BIDDER ${i + 1}] FID:`, contractBidder.fid || 'N/A');
        
        // Find or create user for each bidder
        console.log(`🔍 [BIDDER ${i + 1}] Looking up user in database...`);
        let bidderUser = await User.findOne({ wallet: contractBidder.bidder });
        
        if (!bidderUser) {
          console.log(`⚠️ [BIDDER ${i + 1}] User not found, creating new user...`);
          const newUsername = `User_${contractBidder.bidder.slice(-6)}`;
          // Create a new user if they don't exist
          bidderUser = new User({
            wallet: contractBidder.bidder,
            username: newUsername,
            fid: contractBidder.fid || null
          });
          await bidderUser.save();
          console.log(`✅ [BIDDER ${i + 1}] New user created:`, newUsername);
          console.log(`✅ [BIDDER ${i + 1}] New user ID:`, bidderUser._id);
        } else {
          console.log(`✅ [BIDDER ${i + 1}] User found:`, bidderUser.username);
          console.log(`✅ [BIDDER ${i + 1}] User ID:`, bidderUser._id);
        }

        console.log(`🔢 [BIDDER ${i + 1}] Formatting bid amount...`);
        console.log(`🔢 [BIDDER ${i + 1}] Raw BigNumber:`, contractBidder.bidAmount);
        const formattedString = contractBidder.bidAmount;
        console.log(`🔢 [BIDDER ${i + 1}] Formatted string:`, formattedString);

        const formattedBidAmount = Number(formattedString);
        console.log(`🔢 [BIDDER ${i + 1}] Final numeric amount:`, formattedBidAmount);
        
        // Calculate USD value
        console.log(`💵 [BIDDER ${i + 1}] Calculating USD value...`);
        let usdValue = null;
        if (tokenPriceUSD > 0) {
          usdValue = calculateUSDValue(formattedBidAmount, tokenPriceUSD);
          console.log(`💵 [BIDDER ${i + 1}] Bid amount: ${formattedBidAmount}, USD value: $${usdValue}`);
        } else {
          console.log(`⚠️ [BIDDER ${i + 1}] Token price is 0, skipping USD calculation`);
        }

        const bidData = {
          user: bidderUser._id,
          bidAmount: formattedBidAmount,
          usdcValue: usdValue,
          bidTimestamp: new Date() // Use current time since we don't have exact timestamp from contract
        };
        console.log(`📝 [BIDDER ${i + 1}] Bid data created:`, JSON.stringify(bidData, null, 2));

        // Add to both arrays
        auction.bidders.push(bidData as IBidder);
        allBids.push({ ...bidData, bidderUser });
        console.log(`✅ [BIDDER ${i + 1}] Bid added to auction and tracking arrays`);
      }
      console.log(`\n✅ [PROCESSING] Finished processing all ${contractBidders.length} bidders`);

      // Find bid with highest usdValue and set winningBid
      console.log('\n🏆 [WINNER] Determining auction winner...');
      console.log('🏆 [WINNER] Total bids to evaluate:', allBids.length);
      if (allBids.length > 0) {
        console.log('🏆 [WINNER] Finding highest bid by USD value...');
        const highestBid = allBids.reduce((prev, current) => {
          return (current.usdcValue || 0) > (prev.usdcValue || 0) ? current : prev;
        });
        console.log('🏆 [WINNER] Highest bid found!');
        console.log('🏆 [WINNER] Winner user ID:', highestBid.bidderUser._id);
        console.log('🏆 [WINNER] Winner username:', highestBid.bidderUser.username);
        console.log('🏆 [WINNER] Winning bid amount:', highestBid.bidAmount);
        console.log('🏆 [WINNER] Winning bid USD value:', highestBid.usdcValue);
        
        auction.winningBid = highestBid.bidderUser._id;
        
        // Update the winner's bidsWon field
        console.log('🏆 [WINNER] Updating winner\'s bidsWon field...');
        await User.findByIdAndUpdate(
          highestBid.bidderUser._id,
          { $addToSet: { bidsWon: auction._id } }
        );
        console.log('✅ [WINNER] Winner\'s bidsWon field updated successfully');
      } else {
        console.log('⚠️ [WINNER] No bids found, setting winningBid to \'no_bids\'');
        auction.winningBid = 'no_bids';
      }
    } else {
      console.log('⚠️ [WINNER] No contract bidders provided, setting winningBid to \'no_bids\'');
      auction.winningBid = 'no_bids';
    }

    // End the auction by setting the end date to now and status to ended
    console.log('\n🔚 [STATUS] Ending auction...');
    console.log('🔚 [STATUS] Setting end date to:', currentDate.toISOString());
    auction.endDate = currentDate;
    console.log('🔚 [STATUS] Setting status to: ended');
    auction.status = 'ended';
    console.log('💾 [SAVE] Saving auction to database...');
    await auction.save();
    console.log('✅ [SAVE] Auction saved successfully');
    console.log('✅ [SAVE] Final auction state - Status:', auction.status);
    console.log('✅ [SAVE] Final auction state - Bidders count:', auction.bidders.length);
    console.log('✅ [SAVE] Final auction state - Winning bid:', auction.winningBid);

    // Trigger fee distribution in the background (true fire-and-forget)
    // This runs server-side so it continues even if client disconnects
    console.log('\n💸 [FEE DISTRIBUTION] Checking token address...');
    if (auction.tokenAddress) {
      console.log('💸 [FEE DISTRIBUTION] Token address found:', auction.tokenAddress);
      console.log('🔄 [FEE DISTRIBUTION] Initiating server-side fee distribution...');
      
      // Create the fee distribution request
      const feeDistributionPayload = {
        token: auction.tokenAddress
      };
      console.log('📦 [FEE DISTRIBUTION] Payload:', JSON.stringify(feeDistributionPayload, null, 2));
      
      const feeDistributionUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/handleFeeDistribution`;
      console.log('🌐 [FEE DISTRIBUTION] Target URL:', feeDistributionUrl);

      // True fire-and-forget: no await, no promise chaining
      // This will not block the response and runs completely independently
      console.log('🚀 [FEE DISTRIBUTION] Sending request in background...');
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
      
      console.log('✅ [FEE DISTRIBUTION] Request initiated in background (35-40s expected)');
      console.log('ℹ️ [FEE DISTRIBUTION] Response will not block client');
    } else {
      console.log('⚠️ [FEE DISTRIBUTION] No token address found, skipping fee distribution');
    }

    console.log('\n✅ [SUCCESS] Auction ended successfully!');
    console.log('📤 [RESPONSE] Preparing success response...');
    const response = {
      success: true,
      message: 'Auction ended successfully',
      tokenAddress: auction.tokenAddress,
    };
    console.log('📤 [RESPONSE] Response data:', JSON.stringify(response, null, 2));
    console.log('📤 [RESPONSE] Status code: 200');
    return NextResponse.json(response, { status: 200 });

  } catch (error:any) {
    console.error('\n❌ [ERROR] Critical error ending auction');
    console.error('❌ [ERROR] Error type:', error?.constructor?.name);
    console.error('❌ [ERROR] Error message:', error?.message);
    console.error('❌ [ERROR] Full error:', error);
    console.error('❌ [ERROR] Stack trace:', error?.stack);
    console.log('📤 [ERROR RESPONSE] Preparing error response...');
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