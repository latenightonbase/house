import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import Whitelist from '@/utils/schemas/Whitelist';
import { authenticateApiKeyRequest } from '@/utils/apiKeyAuth';
import {
  createAuctionOnChain,
  getTokenDecimals,
  getTokenSymbol,
} from '@/utils/serverWallet';
import { checkTokenAmount } from '@/utils/checkTokenAmount';
import { scheduleAuctionReminders, scheduleAuctionEnd } from '@repo/queue';
import { awardXP, XP_REWARDS } from '@/utils/xpService';

export async function POST(req: NextRequest) {
  const authResult = await authenticateApiKeyRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    await dbConnect();

    const body = await req.json();
    const {
      auctionName,
      description,
      tokenAddress,
      minimumBid,
      durationHours,
    } = body;

    // Validate required fields
    if (!auctionName || !tokenAddress || !minimumBid || !durationHours) {
      return NextResponse.json(
        {
          error: 'Missing required fields: auctionName, tokenAddress, minimumBid, durationHours',
        },
        { status: 400 }
      );
    }

    if (auctionName.length > 30) {
      return NextResponse.json(
        { error: 'Auction name cannot exceed 30 characters' },
        { status: 400 }
      );
    }

    if (description && description.length > 200) {
      return NextResponse.json(
        { error: 'Description cannot exceed 200 characters' },
        { status: 400 }
      );
    }

    if (durationHours < 1 || durationHours > 168) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 168 hours' },
        { status: 400 }
      );
    }

    if (minimumBid <= 0) {
      return NextResponse.json(
        { error: 'Minimum bid must be greater than 0' },
        { status: 400 }
      );
    }

    // Check whitelist / token balance
    const botWalletAddress = authResult.botWallet.address;
    // const checkWl = await Whitelist.findOne({
    //   walletAddress: botWalletAddress.toLowerCase(),
    // });

    // if (!checkWl) {
    //   try {
    //     const hasEnough = await checkTokenAmount(botWalletAddress);
    //     if (!hasEnough.allow) {
    //       return NextResponse.json(
    //         { error: 'Insufficient token balance in bot wallet to create auctions' },
    //         { status: 403 }
    //       );
    //     }
    //   } catch {
    //     return NextResponse.json(
    //       { error: 'Failed to verify token balance' },
    //       { status: 500 }
    //     );
    //   }
    // }

    // Get token info
    const [tokenDecimals, tokenSymbol] = await Promise.all([
      getTokenDecimals(tokenAddress),
      getTokenSymbol(tokenAddress),
    ]);

    // Generate auction ID
    const auctionId = String(Date.now());

    // Calculate minimum bid in wei
    const minBidAmountWei = ethers.parseUnits(
      minimumBid.toString(),
      tokenDecimals
    );

    // Sign and submit the on-chain transaction
    let txResult;
    try {
      txResult = await createAuctionOnChain(authResult.botWallet, {
        auctionId,
        tokenAddress,
        tokenName: tokenSymbol,
        durationHours: Math.round(durationHours),
        minBidAmount: minBidAmountWei,
      });
    } catch (error: any) {
      console.error('[v1/auctions/create] Chain tx failed:', error);

      let errorMessage = 'Transaction failed on-chain';
      if (error?.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH in bot wallet for gas. Please fund your bot wallet.';
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Save to database
    const now = new Date();
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + Math.round(durationHours));

    const newAuction = new Auction({
      auctionName,
      description: description || undefined,
      currency: tokenSymbol,
      tokenAddress,
      blockchainAuctionId: auctionId,
      endDate,
      startDate: now,
      hostedBy: authResult.user._id,
      minimumBid: parseFloat(minimumBid.toString()),
      startingWallet: botWalletAddress,
      createdByType: 'bot',
    });

    await newAuction.save();

    // Update user's hosted auctions
    authResult.user.hostedAuctions.push(newAuction._id);
    await authResult.user.save();

    // Award XP (non-blocking)
    awardXP({
      userId: authResult.user._id,
      amount: XP_REWARDS.CREATE_AUCTION,
      action: 'CREATE_AUCTION',
      metadata: {
        auctionId: newAuction._id,
        auctionName: newAuction.auctionName,
        source: 'api_v1',
      },
    }).catch((err) => {
      console.error('Failed to award XP for auction creation:', err);
    });

    // Schedule jobs (non-blocking)
    try {
      await Promise.all([
        scheduleAuctionReminders(
          newAuction._id.toString(),
          parseInt(auctionId),
          auctionName,
          now,
          endDate
        ),
        scheduleAuctionEnd(
          newAuction._id.toString(),
          auctionId,
          auctionName,
          endDate
        ),
      ]);
    } catch (err) {
      console.error('Failed to schedule jobs (non-blocking):', err);
    }

    return NextResponse.json(
      {
        message: 'Auction created successfully',
        auction: {
          id: newAuction._id,
          blockchainAuctionId: auctionId,
          auctionName,
          description: description || null,
          currency: tokenSymbol,
          tokenAddress,
          minimumBid: parseFloat(minimumBid.toString()),
          durationHours: Math.round(durationHours),
          startDate: now,
          endDate,
          status: 'ongoing',
          txHash: txResult.txHash,
          botWallet: botWalletAddress,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v1/auctions/create] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
