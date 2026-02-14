import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Bid from '@/utils/schemas/Bid';
import { getFidsWithCache } from '@/utils/fidCache';

export async function GET() {
  try {
    await dbConnect();

    // Fetch last 5 bids with user and auction populated
    const recentBids = await Bid.find()
      .sort({ bidTimestamp: -1 })
      .limit(5)
      .populate({
        path: 'user',
        select: 'socialId socialPlatform username twitterProfile wallet'
      })
      .populate({
        path: 'auction',
        select: 'auctionName blockchainAuctionId'
      })
      .lean();

    if (!recentBids || recentBids.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Collect Farcaster FIDs to fetch from Neynar
    const farcasterFids: string[] = [];
    recentBids.forEach((bid: any) => {
      if (
        bid.user?.socialPlatform === 'FARCASTER' &&
        bid.user?.socialId &&
        !bid.user.socialId.startsWith('none') &&
        !bid.user.socialId.startsWith('0x')
      ) {
        farcasterFids.push(bid.user.socialId);
      }
    });

    // Fetch Neynar data for Farcaster users
    let neynarUsersMap: Record<string, any> = {};
    if (farcasterFids.length > 0) {
      try {
        neynarUsersMap = await getFidsWithCache(farcasterFids);
      } catch (error) {
        console.error('Error fetching Neynar data:', error);
      }
    }

    // Transform and enhance bid data
    const enhancedBids = recentBids.map((bid: any) => {
      let bidderName = 'Anonymous';
      let bidderPfp = `https://api.dicebear.com/5.x/identicon/svg?seed=${bid.user?.wallet || 'default'}`;
      
      // Get bidder info based on social platform
      if (bid.user?.socialPlatform === 'FARCASTER' && bid.user?.socialId) {
        const neynarUser = neynarUsersMap[bid.user.socialId];
        if (neynarUser) {
          bidderName = neynarUser.display_name || neynarUser.username || bidderName;
          bidderPfp = neynarUser.pfp_url || bidderPfp;
        } else if (bid.user.username) {
          bidderName = bid.user.username;
        }
      } else if (bid.user?.socialPlatform === 'TWITTER' && bid.user?.twitterProfile) {
        bidderName = bid.user.twitterProfile.name || bid.user.twitterProfile.username || bidderName;
        bidderPfp = bid.user.twitterProfile.profileImageUrl || bidderPfp;
      } else if (bid.user?.username) {
        bidderName = bid.user.username;
      } else if (bid.user?.wallet) {
        bidderName = `${bid.user.wallet.slice(0, 6)}...${bid.user.wallet.slice(-4)}`;
      }

      return {
        _id: bid._id.toString(),
        bidderName,
        bidderPfp,
        bidderWallet: bid.user?.wallet || '',
        socialId: bid.user?.socialId || '',
        socialPlatform: bid.user?.socialPlatform || '',
        auctionName: bid.auction?.auctionName || 'Unknown Auction',
        blockchainAuctionId: bid.auction?.blockchainAuctionId || bid.blockchainAuctionId,
        bidAmount: bid.bidAmount,
        usdcValue: bid.usdcValue,
        currency: bid.currency,
        bidTimestamp: bid.bidTimestamp,
        source: bid.source,
      };
    });

    return NextResponse.json({
      success: true,
      data: enhancedBids
    });

  } catch (error) {
    console.error('Error fetching recent bids:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch recent bids',
        data: [] 
      },
      { status: 500 }
    );
  }
}
