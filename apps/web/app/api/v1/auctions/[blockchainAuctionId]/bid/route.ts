import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import dbConnect from '@/utils/db';
import Auction, { IBidder } from '@/utils/schemas/Auction';
import Bid from '@/utils/schemas/Bid';
import WeeklyBidderLeaderboard from '@/utils/schemas/WeeklyBidderLeaderboard';
import { authenticateApiKeyRequest } from '@/utils/apiKeyAuth';
import {
  placeBidOnChain,
  getTokenDecimals,
  getWalletBalances,
} from '@/utils/serverWallet';
import { fetchTokenPrice } from '@/utils/tokenPrice';
import { getWeekBoundaries } from '@/utils/weekHelpers';
import { awardXP, calculateBidXP } from '@/utils/xpService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ blockchainAuctionId: string }> }
) {
  const authResult = await authenticateApiKeyRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    await dbConnect();

    const { blockchainAuctionId } = await params;
    const body = await req.json();
    const { amount } = body;

    // Validate
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Find auction
    const auction = await Auction.findOne({ blockchainAuctionId });
    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Check if auction is active
    const now = new Date();
    if (now > auction.endDate) {
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 });
    }

    if (auction.status !== 'ongoing') {
      return NextResponse.json(
        { error: `Auction is ${auction.status}` },
        { status: 400 }
      );
    }

    // Validate bid amount against minimum and current highest
    if (amount < auction.minimumBid) {
      return NextResponse.json(
        {
          error: `Bid must be at least ${auction.minimumBid} ${auction.currency}`,
        },
        { status: 400 }
      );
    }

    const currentHighestBid =
      auction.bidders.length > 0
        ? Math.max(
            ...auction.bidders.map((bidder: IBidder) => bidder.bidAmount)
          )
        : 0;

    if (amount <= currentHighestBid) {
      return NextResponse.json(
        {
          error: `Bid must be higher than current highest bid of ${currentHighestBid} ${auction.currency}`,
        },
        { status: 400 }
      );
    }

    // Check bot wallet has enough tokens
    const tokenDecimals = await getTokenDecimals(auction.tokenAddress);
    const bidAmountWei = ethers.parseUnits(amount.toString(), tokenDecimals);

    const balances = await getWalletBalances(
      authResult.botWallet.address,
      auction.tokenAddress
    );

    if (
      balances.tokenBalance === null ||
      parseFloat(balances.tokenBalance) < amount
    ) {
      return NextResponse.json(
        {
          error: `Insufficient ${auction.currency} balance in bot wallet. Have: ${balances.tokenBalance || '0'}, Need: ${amount}. Fund your bot wallet: ${authResult.botWallet.address}`,
        },
        { status: 400 }
      );
    }

    // Sign and submit on-chain
    let txResult;
    try {
      txResult = await placeBidOnChain(authResult.botWallet, {
        auctionId: blockchainAuctionId,
        tokenAddress: auction.tokenAddress,
        bidAmountWei,
        fid: authResult.user.socialId || authResult.user._id.toString(),
      });
    } catch (error: any) {
      console.error('[v1/bid] Chain tx failed:', error);

      let errorMessage = 'Bid transaction failed on-chain';
      if (error?.message?.includes('insufficient funds')) {
        errorMessage =
          'Insufficient ETH for gas. Fund your bot wallet with some ETH.';
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Calculate USD value
    let usdcValue: number = 0;
    try {
      const isUSDC =
        auction.tokenAddress?.toLowerCase() ===
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
      if (isUSDC) {
        usdcValue = amount;
      } else {
        const tokenPrice = await fetchTokenPrice(auction.tokenAddress);
        usdcValue = amount * tokenPrice;
      }
    } catch {
      console.error('Failed to calculate USD value');
    }

    // Update auction in DB
    const newBid = {
      user: authResult.user._id,
      bidAmount: amount,
      usdcValue,
      bidTimestamp: new Date(),
      source: 'bot' as const,
    };
    auction.bidders.push(newBid);
    await auction.save();

    // Create Bid document
    let createdBid = null;
    try {
      createdBid = await Bid.create({
        auction: auction._id,
        user: authResult.user._id,
        socialId: authResult.user.socialId || authResult.user._id.toString(),
        bidAmount: amount,
        usdcValue,
        currency: auction.currency,
        tokenAddress: auction.tokenAddress,
        blockchainAuctionId,
        bidTimestamp: new Date(),
        source: 'bot',
      });
    } catch (bidError) {
      console.error('Failed to create Bid document (non-blocking):', bidError);
    }

    // Add to participated auctions
    if (!authResult.user.participatedAuctions.includes(auction._id)) {
      authResult.user.participatedAuctions.push(auction._id);
      await authResult.user.save();
    }

    // Award XP (if not bidding on own auction)
    if (auction.hostedBy.toString() !== authResult.user._id.toString()) {
      const bidXP = calculateBidXP(usdcValue);
      awardXP({
        userId: authResult.user._id,
        amount: bidXP,
        action: 'BID',
        metadata: {
          auctionId: auction._id,
          auctionName: auction.auctionName,
          bidAmount: amount,
          usdValue: usdcValue,
          currency: auction.currency,
          source: 'api_v1',
        },
      }).catch((err) => {
        console.error('Failed to award XP for bid:', err);
      });
    }

    // Update weekly leaderboard
    if (
      usdcValue >= 10 &&
      auction.hostedBy.toString() !== authResult.user._id.toString()
    ) {
      try {
        const { weekStartDate, weekEndDate } = getWeekBoundaries();

        const existingEntry = await WeeklyBidderLeaderboard.findOne({
          user: authResult.user._id,
          weekStartDate,
        });

        if (existingEntry) {
          existingEntry.totalSpentUSD += usdcValue;
          existingEntry.bidCount += 1;
          await existingEntry.save();
        } else {
          await WeeklyBidderLeaderboard.create({
            user: authResult.user._id,
            weekStartDate,
            weekEndDate,
            totalSpentUSD: usdcValue,
            bidCount: 1,
            claimed: false,
            rewardAmount: 0,
          });
        }
      } catch (error) {
        console.error('Failed to update weekly leaderboard:', error);
      }
    }

    // Trigger outbid notification (fire and forget)
    fetch(
      `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/notifications/outbid/${blockchainAuctionId}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    ).catch((err) =>
      console.error('Error sending outbid notification:', err)
    );

    return NextResponse.json(
      {
        message: 'Bid placed successfully',
        bid: {
          amount,
          currency: auction.currency,
          usdcValue,
          bidTimestamp: new Date(),
          auctionId: auction._id,
          blockchainAuctionId,
          bidId: createdBid?._id || null,
          txHash: txResult.bidTxHash,
          botWallet: authResult.botWallet.address,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v1/bid] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
