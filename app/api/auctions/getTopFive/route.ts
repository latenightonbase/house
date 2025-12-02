import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const currentDate = new Date();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '3'); // Changed default to 3 for faster loading
    const currencyFilter = searchParams.get('currency') || 'all';
    const skip = (page - 1) * limit;

    // Build currency filter query
    let currencyQuery = {};
    if (currencyFilter === 'usdc') {
      currencyQuery = { currency: 'USDC' };
    } else if (currencyFilter === 'creator-coins') {
      currencyQuery = { currency: { $ne: 'USDC' } };
    }

    // Find auctions that are currently running (started but not ended)
    // Sort by endDate ascending (soonest ending first) and implement pagination
    const runningAuctions = await Auction.find({
      status: 'ongoing',
      enabled: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      ...currencyQuery
    })
    .populate('hostedBy') // Populate full host information
    .populate('bidders.user') // Populate full bidder user information
    .sort({ endDate: 1 }) // Sort by end date ascending (soonest ending first)
    .skip(skip)
    .limit(limit)
    .lean(); // Use lean() for faster read-only queries

    // Get total count for pagination info
    const totalCount = await Auction.countDocuments({
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      ...currencyQuery
    });

    if (runningAuctions.length === 0 && page === 1) {
      return NextResponse.json({
        success: true,
        auctions: [],
        total: 0,
        page,
        hasMore: false
      }, { status: 200 });
    }

    if (runningAuctions.length === 0 && page > 1) {
      return NextResponse.json({
        success: true,
        auctions: [],
        total: totalCount,
        page,
        hasMore: false
      }, { status: 200 });
    }

    // Process hostedBy and top bidders data to fetch display names from Neynar API
    const uniqueFids = new Set<string>();
    
    // Collect unique FIDs that don't start with "none" from hosts and top bidders
    runningAuctions.forEach(auction => {
      // Add host FID
      if (auction.hostedBy?.socialId && auction.hostedBy.socialId !== '' && auction.hostedBy.socialPlatform !== "TWITTER") {
        console.log('Adding host FID:', auction.hostedBy.socialId);
        uniqueFids.add(auction.hostedBy.socialId);
      }
      
      // Add top bidder FID if there are bidders
      if (auction.bidders.length > 0) {
        const highestBid = Math.max(...auction.bidders.map((bidder: any) => bidder.bidAmount));
        const topBidder = auction.bidders.find((bidder: any) => bidder.bidAmount === highestBid);
        if (topBidder?.user?.socialId && topBidder.user.socialId !== '' && topBidder.user.socialPlatform !== "TWITTER") {
          uniqueFids.add(topBidder.user.socialId);
        }
      }
    });

    // Fetch display names from Neynar API for valid FIDs
    let neynarUsers: Record<string, any> = {};
    console.log('Unique FIDs collected:', Array.from(uniqueFids));
    if (uniqueFids.size > 0) {
      try {
        const fidsArray = Array.from(uniqueFids);
        console.log('Fetching user data for FIDs:', fidsArray);
        const res = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidsArray.join(',')}`,
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY as string,
            },
          }
        );
        
        if (res.ok) {
          const jsonRes = await res.json();
          console.log('Neynar API response:', jsonRes);
          if (jsonRes.users) {
            // Create a map of fid -> user data
            jsonRes.users.forEach((user: any) => {
              neynarUsers[user.fid] = user;
            });
            console.log('Neynar users mapped:', Object.keys(neynarUsers));
          }
        } else {
          console.error('Neynar API error:', res.status, await res.text());
        }
      } catch (error) {
        console.error('Error fetching user data from Neynar:', error);
      }
    }

    // Calculate additional fields for each auction
    const auctionsWithStats = runningAuctions.map(auction => {

      console.log("Auction Stats", auction)

      // Calculate highest bid
      const highestBid = auction.bidders.length > 0 
        ? Math.max(...auction.bidders.map((bidder: any) => bidder.bidAmount))
        : 0;

      // Find top bidder
      let topBidder = null;
      if (auction.bidders.length > 0) {
        const topBidderData = auction.bidders.find((bidder: any) => bidder.bidAmount === highestBid);
        if (topBidderData) {

          console.log("Top bidder data exists", topBidderData);

          topBidder = {
            ...topBidderData.user,
            bidAmount: topBidderData.bidAmount,
            bidTimestamp: topBidderData.bidTimestamp
          };

          // Enhance top bidder with Neynar data
          if (topBidder.socialId && topBidder.socialId !== '' && topBidder.socialPlatform !== "TWITTER") {
            // For valid FIDs, use data from Neynar API
            const neynarUser = neynarUsers[topBidder.socialId];
            const fallbackWallet = topBidder.wallet;
            const truncatedWallet = fallbackWallet ? `${fallbackWallet.slice(0, 6)}...${fallbackWallet.slice(-4)}` : fallbackWallet;
            topBidder.username = neynarUser?.display_name || topBidder.username || truncatedWallet;
            topBidder.pfp_url = neynarUser?.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${fallbackWallet}`;
          } else if (topBidder.twitterProfile?.username) {
            // No valid FID, use Twitter profile
            topBidder.username = topBidder.twitterProfile.username;
            topBidder.pfp_url = topBidder.twitterProfile.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${topBidder.wallet}`;
          } else {
            // No FID or Twitter profile, use truncated wallet
            const wallet = topBidder.wallet;
            topBidder.username = wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-2)}` : wallet;
            topBidder.pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${wallet}`;
          }
        }
      }

      console.log("Auction's Top Bidder:", topBidder);

      // Calculate participant count
      const participantCount = auction.bidders.length;

      // Calculate time remaining
      const timeRemaining = auction.endDate.getTime() - currentDate.getTime();
      const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));

      // Process hostedBy to add username and display_name fields
      let enhancedHostedBy = { ...auction.hostedBy };
      if (auction.hostedBy?.socialId && auction.hostedBy.socialId !== '' && auction.hostedBy.socialPlatform !== "TWITTER") {
        // For valid FIDs, use data from Neynar API
        const neynarUser = neynarUsers[auction.hostedBy.socialId];
        const fallbackWallet = auction.hostedBy.wallet;
        const truncatedWallet = fallbackWallet ? `${fallbackWallet.slice(0, 6)}...${fallbackWallet.slice(-4)}` : fallbackWallet;
        
        console.log(`Processing host ${auction.hostedBy.socialId}:`, {
          neynarUser: neynarUser ? { username: neynarUser.username, display_name: neynarUser.display_name } : null,
          originalUsername: auction.hostedBy.username,
          fallback: truncatedWallet
        });
        
        // Set both username, display_name, and profile picture
        enhancedHostedBy.username = neynarUser?.username || auction.hostedBy.username || truncatedWallet;
        enhancedHostedBy.display_name = neynarUser?.display_name || null;
        enhancedHostedBy.pfp_url = neynarUser?.pfp_url || auction.hostedBy.twitterProfile?.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${fallbackWallet}`;
        
        console.log(`Enhanced host data:`, {
          username: enhancedHostedBy.username,
          display_name: enhancedHostedBy.display_name,
          pfp_url: enhancedHostedBy.pfp_url
        });
      } else if (auction.hostedBy?.twitterProfile?.username) {
        // No valid FID, use Twitter profile username
        enhancedHostedBy.username = auction.hostedBy.twitterProfile.username;
        enhancedHostedBy.display_name = auction.hostedBy.twitterProfile.name || null;
        enhancedHostedBy.pfp_url = auction.hostedBy.twitterProfile.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${auction.hostedBy.wallet}`;
      } else {
        // No FID or Twitter profile, use existing username or truncated wallet
        const wallet = auction.hostedBy.wallet;
        enhancedHostedBy.username = auction.hostedBy.username || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet);
        enhancedHostedBy.display_name = null;
        enhancedHostedBy.pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${wallet}`;
      }

      return {
        ...auction,
        hostedBy: enhancedHostedBy,
        highestBid,
        topBidder,
        participantCount,
        hoursRemaining,
        bidCount: auction.bidders.length
      };
    });

    return NextResponse.json({
      success: true,
      auctions: auctionsWithStats,
      total: totalCount,
      page,
      hasMore: skip + auctionsWithStats.length < totalCount
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching top 5 running auctions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to fetch running auctions'
      }, 
      { status: 500 }
    );
  }
}
