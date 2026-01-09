import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { authenticateRequest } from '@/utils/authService';
import { getFidsWithCache } from '@/utils/fidCache';
import { getRedisClient } from '@/utils/redisCache';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return authResult.response;
    }

    // Get wallet address from query params
    const { searchParams } = new URL(req.url);
    const socialId = searchParams.get('socialId');

    if (!socialId) {
      return NextResponse.json({ error: 'Social ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Find the user
    const user = await User.findOne({ socialId: socialId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find all auctions where this user is the winner
    const wonAuctions = await Auction.find({
      winningBid: user._id,
      endDate: { $lt: new Date() } // Only ended auctions
    })
    .populate('hostedBy', 'socialId twitterProfile socialPlatform')
    .sort({ endDate: -1 }); // Most recent first

    console.log(`Found ${wonAuctions} won auctions for user with socialId: ${socialId}`);

    // Collect all host FIDs that need Neynar data
    const hostFids: string[] = [];
    wonAuctions.forEach(auction => {
      const host = auction.hostedBy as any;
      console.log('Processing host for auction:', auction._id, host);
      if (host?.socialPlatform === 'FARCASTER' && host?.socialId) {
        hostFids.push(host.socialId);
      }
    });

    console.log('Host FIDs needing Neynar data:', hostFids);

    // Fetch Neynar data for all hosts
    const neynarUsersMap = await getFidsWithCache(hostFids);

    // Identify missing FIDs and make fallback API call if needed
    const missingFids: string[] = [];
    for (const fid of hostFids) {
      if (!neynarUsersMap[fid]) {
        missingFids.push(fid);
      }
    }

    // Make fallback Neynar API call for missing FIDs
    if (missingFids.length > 0) {
      try {
        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${missingFids.join(',')}`, {
          headers: {
            'api_key': process.env.NEYNAR_API_KEY || ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fallback Neynar API response data:', data);
          const redisClient = getRedisClient();
          
          // Cache each user in Redis and add to neynarUsersMap
          for (const user of data.users) {
            neynarUsersMap[user.fid.toString()] = user;
            
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

    console.log('Final Neynar users map:', neynarUsersMap);

    // Format the auctions data
    const formattedAuctions = wonAuctions.map(auction => {
      const now = new Date();
      const endDate = new Date(auction.endDate);
      const startDate = new Date(auction.startDate);
      
      // Get highest bid and participant count
      const highestBid = auction.bidders.length > 0 
        ? Math.max(...auction.bidders.map((bidder: any) => bidder.bidAmount))
        : 0;
      
      const uniqueParticipants = new Set(auction.bidders.map((bidder: any) => bidder.user.toString()));
      const participantCount = uniqueParticipants.size;
      
      const bidCount = auction.bidders.length;

      // Enhance hostedBy with Neynar or Twitter data
      const hostDoc = auction.hostedBy as any;

      console.log('Original host data:', hostDoc);

      let enhancedHostedBy = {username: "", display_name: "", pfp_url: "", socialId: hostDoc.socialId, socialPlatform: hostDoc.socialPlatform, twitterProfile: hostDoc.twitterProfile};

      console.log('Processing host:', enhancedHostedBy.socialId, enhancedHostedBy);
      
      if (hostDoc.socialPlatform === 'TWITTER' && hostDoc.twitterProfile) {
        console.log('Using Twitter profile for host:', hostDoc.socialId);
        // Use Twitter profile
        enhancedHostedBy.username = enhancedHostedBy.twitterProfile.username;
        enhancedHostedBy.display_name = enhancedHostedBy.twitterProfile.name;
        enhancedHostedBy.pfp_url = enhancedHostedBy.twitterProfile.profileImageUrl;
      } else if (hostDoc.socialPlatform === 'FARCASTER' && hostDoc.socialId && !hostDoc.socialId.startsWith('none') && !hostDoc.socialId.startsWith('0x')) {
        console.log('Using Neynar data for host:', hostDoc.socialId);
        // Use Neynar data
        const neynarUser = neynarUsersMap[hostDoc.socialId];

        console.log('Neynar user data:', neynarUser);
        if (neynarUser) {
          enhancedHostedBy.username = neynarUser.username as string;
          enhancedHostedBy.display_name = neynarUser.display_name as string;
          enhancedHostedBy.pfp_url = neynarUser.pfp_url as string;
        }
      }

      console.log('Enhanced host data:', enhancedHostedBy);

      return {
        _id: auction._id,
        auctionName: auction.auctionName,
        endDate: auction.endDate,
        startDate: auction.startDate,
        currency: auction.currency,
        minimumBid: auction.minimumBid,
        blockchainAuctionId: auction.blockchainAuctionId,
        tokenAddress: auction.tokenAddress,
        startingWallet: auction.startingWallet,
        hostedBy: enhancedHostedBy,
        highestBid,
        participantCount,
        bidCount,
        deliveredByHost: auction.deliveredByHost,
        hasReview: auction.hasReview,
        timeInfo: `Ended ${endDate.toLocaleDateString()}`
      };
    });

    return NextResponse.json({
      success: true,
      auctions: formattedAuctions,
      total: formattedAuctions.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching won auctions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to fetch won auctions'
      }, 
      { status: 500 }
    );
  }
}