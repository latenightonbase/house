import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { fetchTokenPrice } from '@/utils/tokenPrice';

export async function GET() {
  try {
    await connectDB();

    // Step 1: Check if we have ended auctions
    const endedAuctions = await Auction.find({ status: 'ended' }).limit(5);
    console.log('Sample ended auctions:', endedAuctions.length);
    console.log('Sample winningBid values:', endedAuctions.map(a => ({ id: a._id, winningBid: a.winningBid, hasWinningBid: !!a.winningBid })));

    // Step 2: Fix missing usdcValue for winning bids in non-USDC auctions
    const auctionsNeedingFix = await Auction.find({
      status: 'ended',
      currency: { $ne: 'USDC' },
      bidders: { $exists: true, $ne: [] }
    });

    for (const auction of auctionsNeedingFix) {
      if (auction.bidders && auction.bidders.length > 0) {
        // Find the highest bid
        let maxBidAmount = -1;
        let maxBidIndex = -1;
        
        auction.bidders.forEach((bid: any, index: number) => {
          if (bid.bidAmount > maxBidAmount) {
            maxBidAmount = bid.bidAmount;
            maxBidIndex = index;
          }
        });

        // Check if the highest bid is missing usdcValue
        if (maxBidIndex >= 0 && !auction.bidders[maxBidIndex].usdcValue) {
          try {
            console.log(`Fixing missing usdcValue for auction ${auction._id}, currency: ${auction.currency}`);
            
            // Fetch token price
            const tokenPrice = await fetchTokenPrice(auction.tokenAddress);
            const usdcValue = auction.bidders[maxBidIndex].bidAmount * tokenPrice;
            
            // Update the bid with usdcValue
            auction.bidders[maxBidIndex].usdcValue = usdcValue;
            await auction.save();
            
            console.log(`Updated auction ${auction._id} highest bid with usdcValue: ${usdcValue}`);
          } catch (error) {
            console.error(`Failed to fetch price for token ${auction.tokenAddress}:`, error);
          }
        }
      }
    }

    // Step 3: Get ended auctions with bidders and calculate highest bids
    const highestBids = await Auction.aggregate([
      {
        $match: {
          status: 'ended',
          bidders: { $exists: true, $ne: [] }
        }
      },
      {
        $addFields: {
          highestBidAmount: { $max: '$bidders.bidAmount' },
          highestBidderInfo: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$bidders',
                  as: 'bid',
                  cond: { $eq: ['$$bid.bidAmount', { $max: '$bidders.bidAmount' }] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          // Calculate USDC value: use usdcValue if exists, otherwise use bidAmount for USDC currency
          effectiveUsdcValue: {
            $cond: {
              if: { $ne: ['$highestBidderInfo.usdcValue', null] },
              then: '$highestBidderInfo.usdcValue',
              else: {
                $cond: {
                  if: { $eq: ['$currency', 'USDC'] },
                  then: '$highestBidderInfo.bidAmount',
                  else: null
                }
              }
            }
          }
        }
      },
      {
        $match: {
          effectiveUsdcValue: { $ne: null, $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'highestBidderInfo.user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $sort: { effectiveUsdcValue: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          auctionId: '$_id',
          bidAmount: '$highestBidAmount',
          usdcValue: '$effectiveUsdcValue',
          bidTimestamp: '$highestBidderInfo.bidTimestamp',
          userId: '$userDetails._id',
          wallet: '$userDetails.wallet',
          username: '$userDetails.username',
          socialId: '$userDetails.socialId',
          socialPlatform: '$userDetails.socialPlatform',
          twitterProfile: '$userDetails.twitterProfile',
          auctionName: '$auctionName',
          currency: '$currency'
        }
      }
    ]);

    console.log('Fetched highest bids:', highestBids.length);

    // Collect unique FIDs that are valid
    const uniqueFids = new Set<string>();
    highestBids.forEach(bid => {
      if (bid.socialId && bid.socialId !== '' && bid.socialPlatform !== "TWITTER") {
        uniqueFids.add(bid.socialId);
      }
    });

    // Fetch display names from Neynar API for valid FIDs
    let neynarUsers: Record<string, any> = {};
    if (uniqueFids.size > 0) {
      try {
        const fidsArray = Array.from(uniqueFids);
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
          if (jsonRes.users) {
            jsonRes.users.forEach((user: any) => {
              console.log('Neynar user fetched in highest bid:', user);
              neynarUsers[user.fid] = user;
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user data from Neynar:', error);
      }
    }

    // Enhance bids with Neynar data
    const enhancedBids = highestBids.map((bid, index) => {
      let enhancedBid = { 
        ...bid,
        _id: `${bid.auctionId}-${bid.userId}-${bid.bidTimestamp}-${index}` // Create unique ID
      };
      
      if (bid.socialId && bid.socialId !== '' && bid.socialPlatform !== "TWITTER") {
        // For valid FIDs, use data from Neynar API
        const neynarUser = neynarUsers[bid.socialId];
        const fallbackWallet = bid.wallet;
        const truncatedWallet = fallbackWallet ? `${fallbackWallet.slice(0, 6)}...${fallbackWallet.slice(-4)}` : fallbackWallet;
        
        enhancedBid.username = neynarUser?.username || bid.username || truncatedWallet;
        enhancedBid.display_name = neynarUser?.display_name || null;
        enhancedBid.pfp_url = neynarUser?.pfp_url || bid.twitterProfile?.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${fallbackWallet}`;
      } else if (bid.twitterProfile?.username) {
        // No valid FID, use Twitter profile
        enhancedBid.username = bid.twitterProfile.username;
        enhancedBid.display_name = bid.twitterProfile.name || null;
        enhancedBid.pfp_url = bid.twitterProfile.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${bid.wallet}`;
      } else {
        // No FID or Twitter profile, use wallet
        const wallet = bid.wallet;
        enhancedBid.username = bid.username || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet);
        enhancedBid.display_name = null;
        enhancedBid.pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${wallet}`;
      }

      return enhancedBid;
    });

    return NextResponse.json({
      success: true,
      data: enhancedBids
    });
  } catch (error) {
    console.error('Error fetching highest bids:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}
