import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { getFidsWithCache } from '@/utils/fidCache';
import { getRedisClient } from '@/utils/redisCache';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    User;

    const currentDate = new Date();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    const endedAuctions = await Auction.find({
      status: 'ended',
      enabled: true,
      endDate: { $lt: currentDate },
      bidders: { $exists: true, $ne: [] }
    })
    .populate({
      path: 'hostedBy',
      select: '_id wallet wallets fid socialId socialPlatform username twitterProfile averageRating totalReviews'
    })
    .populate({
      path: 'bidders.user',
      select: '_id wallet wallets fid socialId socialPlatform username twitterProfile'
    })
    .sort({ endDate: -1 })
    .limit(limit)
    .lean();

    if (endedAuctions.length === 0) {
      return NextResponse.json({
        success: true,
        auctions: [],
        total: 0
      }, { status: 200 });
    }

    const hostFids = new Set<string>();
    const bidderFids = new Set<string>();
    
    endedAuctions.forEach(auction => {
      if (auction.hostedBy?.socialId && auction.hostedBy.socialId !== '' && auction.hostedBy.socialPlatform !== "TWITTER") {
        hostFids.add(auction.hostedBy.socialId);
      }
      
      if (auction.bidders.length > 0) {
        const highestBid = Math.max(...auction.bidders.map((bidder: any) => bidder.bidAmount));
        const topBidder = auction.bidders.find((bidder: any) => bidder.bidAmount === highestBid);
        if (topBidder?.user?.socialId && topBidder.user.socialId !== '' && topBidder.user.socialPlatform !== "TWITTER") {
          bidderFids.add(topBidder.user.socialId);
        }
      }
    });

    let neynarUsers: Record<string, any> = {};
    
    const allFids = [...Array.from(hostFids), ...Array.from(bidderFids)];
    if (allFids.length > 0) {
      neynarUsers = await getFidsWithCache(allFids);
      
      const missingFids: string[] = [];
      for (const fid of allFids) {
        if (!neynarUsers[fid]) {
          const hasTwitterProfile = endedAuctions.some(auction => {
            if (auction.hostedBy?.socialId === fid && auction.hostedBy?.twitterProfile) {
              return true;
            }
            return auction.bidders.some((bidder: any) => 
              bidder.user?.socialId === fid && bidder.user?.twitterProfile
            );
          });
          
          if (!hasTwitterProfile) {
            missingFids.push(fid);
          }
        }
      }

      if (missingFids.length > 0) {
        try {
          const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${missingFids.join(',')}`, {
            headers: {
              'api_key': process.env.NEYNAR_API_KEY || ''
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const redisClient = getRedisClient();
            
            for (const user of data.users) {
              neynarUsers[user.fid.toString()] = user;
              
              if (redisClient) {
                try {
                  await redisClient.setex(
                    `fid:${user.fid}`,
                    3600,
                    JSON.stringify(user)
                  );
                } catch (err) {
                  console.warn('Failed to cache Neynar user:', err);
                }
              }
            }
          }
        } catch (error) {
          console.error('Fallback Neynar API call failed:', error);
        }
      }
    }

    const auctionsWithStats = endedAuctions.map(auction => {
      const highestBid = auction.bidders.length > 0 
        ? Math.max(...auction.bidders.map((bidder: any) => bidder.bidAmount))
        : 0;

      let topBidder = null;
      if (auction.bidders.length > 0) {
        const topBidderData = auction.bidders.find((bidder: any) => bidder.bidAmount === highestBid);
        if (topBidderData) {
          topBidder = {
            ...topBidderData.user,
            bidAmount: topBidderData.bidAmount,
            bidTimestamp: topBidderData.bidTimestamp
          };

          if (topBidder.socialId && topBidder.socialId !== '' && topBidder.socialPlatform !== "TWITTER") {
            const neynarUser = neynarUsers[topBidder.socialId];
            const fallbackWallet = topBidder.wallet;
            const truncatedWallet = fallbackWallet ? `${fallbackWallet.slice(0, 6)}...${fallbackWallet.slice(-4)}` : fallbackWallet;
            topBidder.username = neynarUser?.display_name || topBidder.username || truncatedWallet;
            topBidder.pfp_url = neynarUser?.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${fallbackWallet}`;
          } else if (topBidder.twitterProfile?.username) {
            topBidder.username = topBidder.twitterProfile.username;
            topBidder.pfp_url = topBidder.twitterProfile.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${topBidder.wallet}`;
          } else {
            const wallet = topBidder.wallet;
            topBidder.username = wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-2)}` : wallet;
            topBidder.pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${wallet}`;
          }
        }
      }

      const participantCount = new Set(auction.bidders.map((bidder: any) => bidder.user._id.toString())).size;

      const timeEnded = currentDate.getTime() - auction.endDate.getTime();
      const hoursEnded = Math.floor(timeEnded / (1000 * 60 * 60));

      let enhancedHostedBy = { ...auction.hostedBy };
      if (auction.hostedBy?.socialId && auction.hostedBy.socialId !== '' && auction.hostedBy.socialPlatform !== "TWITTER") {
        const neynarUser = neynarUsers[auction.hostedBy.socialId];
        const fallbackWallet = auction.hostedBy.wallet;
        const truncatedWallet = fallbackWallet ? `${fallbackWallet.slice(0, 6)}...${fallbackWallet.slice(-4)}` : fallbackWallet;
        
        enhancedHostedBy.username = neynarUser?.username || auction.hostedBy.username || truncatedWallet;
        enhancedHostedBy.display_name = neynarUser?.display_name || null;
        enhancedHostedBy.pfp_url = neynarUser?.pfp_url || auction.hostedBy.twitterProfile?.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${fallbackWallet}`;
      } else if (auction.hostedBy?.twitterProfile?.username) {
        enhancedHostedBy.username = auction.hostedBy.twitterProfile.username;
        enhancedHostedBy.display_name = auction.hostedBy.twitterProfile.name || null;
        enhancedHostedBy.pfp_url = auction.hostedBy.twitterProfile.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${auction.hostedBy.wallet}`;
      } else {
        const wallet = auction.hostedBy.wallet;
        enhancedHostedBy.username = auction.hostedBy.username || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet);
        enhancedHostedBy.display_name = null;
        enhancedHostedBy.pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${wallet}`;
      }

      return {
        ...auction,
        hostedBy: {
          ...enhancedHostedBy,
          averageRating: auction.hostedBy?.averageRating ?? 0,
          totalReviews: auction.hostedBy?.totalReviews ?? 0
        },
        highestBid,
        topBidder,
        participantCount,
        hoursEnded,
        bidCount: auction.bidders.length
      };
    });

    return NextResponse.json({
      success: true,
      auctions: auctionsWithStats,
      total: endedAuctions.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching ended auctions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to fetch ended auctions'
      }, 
      { status: 500 }
    );
  }
}
