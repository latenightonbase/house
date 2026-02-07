import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction, { IBidder } from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import Bid from '@/utils/schemas/Bid';
import WeeklyBidderLeaderboard from '@/utils/schemas/WeeklyBidderLeaderboard';
import { fetchTokenPrice } from '@/utils/tokenPrice';
import { getWeekBoundaries } from '@/utils/weekHelpers';
import { authenticateRequest } from '@/utils/authService';
import { awardXP, calculateBidXP } from '@/utils/xpService';

export async function POST(req: NextRequest) {
  console.log("=== BID API ROUTE STARTED ===");
  
  try {
    console.log("Checking authentication...");
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const blockchainAuctionId = req.nextUrl.pathname.split('/')[4];
    console.log("📋 Extracted blockchainAuctionId from URL:", blockchainAuctionId);

    console.log("📥 Parsing request body...");
    const body = await req.json();
    const { bidAmount, socialId, privyId } = body;
    console.log("📋 Request data:", { bidAmount, socialId, blockchainAuctionId });

    // Validate required fields
    if (!bidAmount || (!socialId && !privyId)) {
      console.log("❌ Validation failed - missing required fields");
      return NextResponse.json({ error: 'Missing required fields: bidAmount and socialId' }, { status: 400 });
    }

    if (typeof bidAmount !== 'number' || bidAmount <= 0) {
      console.log("❌ Validation failed - invalid bid amount:", bidAmount);
      return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 });
    }
    console.log("✅ Request validation passed");

    console.log("🔌 Connecting to database...");
    await dbConnect();
    console.log("✅ Database connected");

    // Find the auction by blockchainAuctionId
    console.log("🔍 Looking for auction with blockchainAuctionId:", blockchainAuctionId);
    const auction = await Auction.findOne({ blockchainAuctionId });
    if (!auction) {
      console.log("❌ Auction not found for blockchainAuctionId:", blockchainAuctionId);
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }
    console.log("✅ Auction found:", {
      id: auction._id,
      name: auction.auctionName,
      minimumBid: auction.minimumBid,
      currency: auction.currency,
      biddersCount: auction.bidders?.length || 0
    });

    // Check if auction is active
    const now = new Date();
    console.log("⏰ Checking auction timing:", {
      now: now.toISOString(),
      endDate: auction.endDate.toISOString(),
      isActive: now <= auction.endDate
    });
    
    if (now > auction.endDate) {
      console.log("❌ Auction has ended");
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 });
    }

    // Find or create the user

    let user:any;
    if(privyId){
      console.log("🔍 Looking for user with privyId:", privyId)
      user = await User.findOne({ privyId: privyId });
    } else {
      user = await User.findOne({ socialId: socialId });
    }
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    } else {
      console.log("✅ Existing user found:", user._id);
    }

    // Validate bid amount against minimum bid and existing highest bid
    if (bidAmount < auction.minimumBid) {
      console.log("❌ Bid amount too low:", {
        bidAmount,
        minimumBid: auction.minimumBid
      });
      return NextResponse.json({ 
        error: `Bid amount must be at least ${auction.minimumBid} ${auction.currency}` 
      }, { status: 400 });
    }

    // Check if there's a higher bid
    const currentHighestBid = auction.bidders.length > 0 
      ? Math.max(...auction.bidders.map((bidder: IBidder) => bidder.bidAmount))
      : 0;
    
    console.log("💰 Bid validation:", {
      newBidAmount: bidAmount,
      currentHighestBid,
      minimumBid: auction.minimumBid,
      isValidBid: bidAmount > currentHighestBid
    });

    if (bidAmount <= currentHighestBid) {
      console.log("❌ Bid amount not higher than current highest bid");
      return NextResponse.json({ 
        error: `Bid amount must be higher than the current highest bid of ${currentHighestBid} ${auction.currency}` 
      }, { status: 400 });
    }

    // Add the bid to the auction
    console.log("📝 Adding bid to auction...");
    
    // Calculate USD value for the bid
    let usdcValue: number | undefined = undefined;
    try {
      const isUSDC = auction.tokenAddress?.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
      if (isUSDC) {
        usdcValue = bidAmount;
      } else {
        const tokenPrice = await fetchTokenPrice(auction.tokenAddress);
        usdcValue = bidAmount * tokenPrice;
      }
      console.log("💵 Calculated USD value:", usdcValue);
    } catch (error) {
      console.error("⚠️ Failed to calculate USD value:", error);
    }
    
    const newBid = {
      user: user._id,
      bidAmount,
      usdcValue,
      bidTimestamp: new Date()
    };
    auction.bidders.push(newBid);
    console.log("📋 New bid object:", newBid);

    console.log("💾 Saving auction with new bid...");
    await auction.save();
    console.log("✅ Auction saved successfully");

    // Create separate Bid document for tracking
    let createdBid = null;
    try {
      console.log("📝 Creating separate Bid document...");
      createdBid = await Bid.create({
        auction: auction._id,
        user: user._id,
        socialId: socialId || privyId,
        bidAmount,
        usdcValue: usdcValue || 0,
        currency: auction.currency,
        tokenAddress: auction.tokenAddress,
        blockchainAuctionId,
        bidTimestamp: new Date(),
      });
      console.log("✅ Bid document created successfully:", createdBid._id);
    } catch (bidError) {
      console.error("⚠️ Failed to create Bid document (non-blocking):", bidError);
      // Don't fail the entire bid process if Bid document creation fails
    }

    // Add auction to user's participated auctions if not already there
    if (!user.participatedAuctions.includes(auction._id)) {
      console.log("📝 Adding auction to user's participated auctions...");
      user.participatedAuctions.push(auction._id);
      await user.save();
      console.log("✅ User updated with participated auction");
    } else {
      console.log("ℹ️ User already has this auction in participated auctions");
    }

    // Award XP for bidding (only if not bidding on own auction)
    if (auction.hostedBy.toString() !== user._id.toString()) {
      const bidXP = calculateBidXP(usdcValue || 0);
      try {
        await awardXP({
          userId: user._id,
          amount: bidXP,
          action: 'BID',
          metadata: {
            auctionId: auction._id,
            auctionName: auction.auctionName,
            bidAmount,
            usdValue: usdcValue,
            currency: auction.currency,
          },
        });
        console.log(`✅ Awarded ${bidXP} XP for bid`);
      } catch (err) {
        console.error('⚠️ Failed to award XP for bid:', err);
      }
    } else {
      console.log('ℹ️ No XP awarded (bidding on own auction)');
    }

    // Update weekly leaderboard if bid is >= $10 USD and user is not the auction host
    if (usdcValue && usdcValue >= 10 && auction.hostedBy.toString() !== user._id.toString()) {
      console.log("📊 Updating weekly leaderboard...");
      try {
        const { weekStartDate, weekEndDate } = getWeekBoundaries();
        
        const existingEntry = await WeeklyBidderLeaderboard.findOne({
          user: user._id,
          weekStartDate,
        });

        if (existingEntry) {
          existingEntry.totalSpentUSD += usdcValue;
          existingEntry.bidCount += 1;
          await existingEntry.save();
          console.log("✅ Updated existing weekly leaderboard entry");
        } else {
          await WeeklyBidderLeaderboard.create({
            user: user._id,
            weekStartDate,
            weekEndDate,
            totalSpentUSD: usdcValue,
            bidCount: 1,
            claimed: false,
            rewardAmount: 0,
          });
          console.log("✅ Created new weekly leaderboard entry");
        }
      } catch (error) {
        console.error("⚠️ Failed to update weekly leaderboard:", error);
        // Don't fail the bid if leaderboard update fails
      }
    } else {
      console.log("ℹ️ Bid not eligible for weekly leaderboard (< $10 or bidding on own auction)");
    }

    // Trigger outbid notification asynchronously (fire and forget)
    console.log("📬 Triggering outbid notification...");
    await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/notifications/outbid/${blockchainAuctionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((res)=>{
      console.log('✅ Outbid notification triggered, response status:', res.status);
    }).catch(error => console.error('⚠️ Error sending outbid notification:', error));

    const responseData = {
      success: true,
      message: 'Bid placed successfully',
      bid: {
        amount: bidAmount,
        currency: auction.currency,
        timestamp: new Date(),
        auctionId: auction._id,
        bidId: createdBid?._id || null,
        usdcValue: usdcValue || 0
      }
    };
    
    console.log("✅ Bid placement successful! Returning response:", responseData);
    console.log("=== BID API ROUTE COMPLETED SUCCESSFULLY ===");
    
    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error('❌ ERROR in bid placement route:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    console.log("=== BID API ROUTE FAILED ===");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}