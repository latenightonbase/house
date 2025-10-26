import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const currentDate = new Date();

    // Find auctions that are currently running (started but not ended)
    // Sort by endDate ascending (soonest ending first) and limit to 5
    const runningAuctions = await Auction.find({
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate }
    })
    .populate('hostedBy', 'wallet username blockchainAuctionId fid') // Populate host information
    .populate('bidders.user', 'wallet username fid') // Populate bidder user information
    .sort({ endDate: 1 }) // Sort by end date ascending (soonest ending first)
    .limit(5) // Limit to top 5
    .lean(); // Use lean for better performance

    console.log('Running Auctions:', runningAuctions);

    if (runningAuctions.length === 0) {
      return NextResponse.json({
        success: true,
        auctions: [],
        total: 0
      }, { status: 200 });
    }

    // Process hostedBy and top bidders data to fetch display names from Neynar API
    const uniqueFids = new Set<string>();
    
    // Collect unique FIDs that don't start with "none" from hosts and top bidders
    runningAuctions.forEach(auction => {
      // Add host FID
      if (auction.hostedBy?.fid && !auction.hostedBy.fid.startsWith('none')) {
        uniqueFids.add(auction.hostedBy.fid);
      }
      
      // Add top bidder FID if there are bidders
      if (auction.bidders.length > 0) {
        const highestBid = Math.max(...auction.bidders.map((bidder: any) => bidder.bidAmount));
        const topBidder = auction.bidders.find((bidder: any) => bidder.bidAmount === highestBid);
        if (topBidder?.user?.fid && !topBidder.user.fid.startsWith('none')) {
          uniqueFids.add(topBidder.user.fid);
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

      // Calculate highest bid
      const highestBid = auction.bidders.length > 0 
        ? Math.max(...auction.bidders.map((bidder: any) => bidder.bidAmount))
        : 0;

      // Find top bidder
      let topBidder = null;
      if (auction.bidders.length > 0) {
        const topBidderData = auction.bidders.find((bidder: any) => bidder.bidAmount === highestBid);
        if (topBidderData) {
          topBidder = {
            ...topBidderData.user,
            bidAmount: topBidderData.bidAmount,
            bidTimestamp: topBidderData.bidTimestamp
          };

          // Enhance top bidder with Neynar data
          if (topBidder.fid) {
            if (topBidder.fid.startsWith('none')) {
              // For FIDs starting with "none", use truncated wallet as username
              const wallet = topBidder.wallet;
              topBidder.username = wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-2)}` : wallet;
              topBidder.pfp_url =  `https://api.dicebear.com/5.x/identicon/svg?seed=${wallet}`;
            } else {
              // For valid FIDs, use data from Neynar API
              const neynarUser = neynarUsers[topBidder.fid];
              const fallbackWallet = topBidder.wallet;
              const truncatedWallet = fallbackWallet ? `${fallbackWallet.slice(0, 6)}...${fallbackWallet.slice(-4)}` : fallbackWallet;
              topBidder.username = neynarUser?.display_name || topBidder.username || truncatedWallet;
              topBidder.pfp_url = neynarUser?.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${fallbackWallet.toLowerCase()}`;
            }
          }
        }
      }

      // Calculate participant count
      const uniqueUsers = new Set(auction.bidders.map((bidder: any) => bidder.user.toString()));
      const participantCount = uniqueUsers.size;

      // Calculate time remaining
      const timeRemaining = auction.endDate.getTime() - currentDate.getTime();
      const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));

      // Process hostedBy to add username field
      let enhancedHostedBy = { ...auction.hostedBy };
      if (auction.hostedBy?.fid) {
        if (auction.hostedBy.fid.startsWith('none')) {
          // For FIDs starting with "none", use truncated wallet as username
          const wallet = auction.hostedBy.wallet;
          enhancedHostedBy.username = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet;
        } else {
          // For valid FIDs, use displayName from Neynar API or fallback to existing username
          const neynarUser = neynarUsers[auction.hostedBy.fid];
          const fallbackWallet = auction.hostedBy.wallet;
          const truncatedWallet = fallbackWallet ? `${fallbackWallet.slice(0, 6)}...${fallbackWallet.slice(-4)}` : fallbackWallet;
          enhancedHostedBy.username = neynarUser?.display_name || auction.hostedBy.username || truncatedWallet;
        }
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
      total: auctionsWithStats.length
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
