import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { fetchTokenPrice } from '@/utils/tokenPrice';

export async function GET() {
  try {
    await connectDB();

    // Fix missing usdcValue for winning bids in non-USDC auctions
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

    const topRevenueUsers = await Auction.aggregate([
      {
        $match: {
          status: 'ended',
          bidders: { $exists: true, $ne: [] }
        }
      },
      {
        $addFields: {
          // Calculate revenue: if totalRevenue exists use it, otherwise calculate from highest bid's usdcValue
          calculatedRevenue: {
            $cond: {
              if: { $and: [
                { $ne: ['$totalRevenue', null] },
                { $gt: ['$totalRevenue', 0] }
              ]},
              then: '$totalRevenue',
              else: {
                $let: {
                  vars: {
                    highestBid: { $max: '$bidders.bidAmount' },
                    highestBidWithUsdc: {
                      $filter: {
                        input: '$bidders',
                        as: 'bid',
                        cond: { 
                          $eq: ['$$bid.bidAmount', { $max: '$bidders.bidAmount' }]
                        }
                      }
                    }
                  },
                  in: {
                    $cond: {
                      if: { $gt: [{ $size: '$$highestBidWithUsdc' }, 0] },
                      then: {
                        $cond: {
                          if: { $ne: [{ $arrayElemAt: ['$$highestBidWithUsdc.usdcValue', 0] }, null] },
                          then: { $arrayElemAt: ['$$highestBidWithUsdc.usdcValue', 0] },
                          else: {
                            $cond: {
                              if: { $eq: ['$currency', 'USDC'] },
                              then: { $arrayElemAt: ['$$highestBidWithUsdc.bidAmount', 0] },
                              else: 0
                            }
                          }
                        }
                      },
                      else: 0
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $match: {
          calculatedRevenue: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$hostedBy',
          totalRevenue: { $sum: '$calculatedRevenue' },
          auctionCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          _id: 1,
          totalRevenue: 1,
          auctionCount: 1,
          wallet: '$userDetails.wallet',
          username: '$userDetails.username',
          socialId: '$userDetails.socialId',
          socialPlatform: '$userDetails.socialPlatform',
          twitterProfile: '$userDetails.twitterProfile'
        }
      }
    ]);


    // Collect unique FIDs that are valid
    const uniqueFids = new Set<string>();
    topRevenueUsers.forEach(user => {
    
      if (user.socialId && user.socialId !== '' && user.socialPlatform !== "TWITTER") {
        console.log('Adding unique FID:', user.socialId);
        uniqueFids.add(user.socialId);
      }
    });

    console.log('Unique FIDs:', uniqueFids);

    // Fetch display names from Neynar API for valid FIDs
    let neynarUsers: Record<string, any> = {};
    if (uniqueFids.size > 0) {
      try {
        const fidsArray = Array.from(uniqueFids);
        console.log('Fetching Neynar data for FIDs:', fidsArray);
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
            jsonRes.users.forEach((user: any) => {
              console.log('Neynar user fetched:', user);
              neynarUsers[user.fid] = user;
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user data from Neynar:', error);
      }
    }

    // Enhance users with Neynar data
    const enhancedUsers = topRevenueUsers.map(user => {

      console.log('Processing top rev earner:', user);

      let enhancedUser = { ...user };
      
      if (user.socialId && user.socialId !== '' && user.socialPlatform !== "TWITTER") {
        // For valid FIDs, use data from Neynar API
        const neynarUser = neynarUsers[user.socialId];
        console.log('Neynar user data:', neynarUser);
        const fallbackWallet = user.wallet;
        const truncatedWallet = fallbackWallet ? `${fallbackWallet.slice(0, 6)}...${fallbackWallet.slice(-4)}` : fallbackWallet;
        
        enhancedUser.username = neynarUser?.username || user.username || truncatedWallet;
        enhancedUser.display_name = neynarUser?.display_name || null;
        enhancedUser.pfp_url = neynarUser?.pfp_url || user.twitterProfile?.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${fallbackWallet}`;
      } else if (user.twitterProfile?.username) {
        // No valid FID, use Twitter profile
        enhancedUser.username = user.twitterProfile.username;
        enhancedUser.display_name = user.twitterProfile.name || null;
        enhancedUser.pfp_url = user.twitterProfile.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${user.wallet}`;
      } else {
        // No FID or Twitter profile, use wallet
        const wallet = user.wallet;
        enhancedUser.username = user.username || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet);
        enhancedUser.display_name = null;
        enhancedUser.pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${wallet}`;
      }

      return enhancedUser;
    });

    return NextResponse.json({
      success: true,
      data: enhancedUsers
    });
  } catch (error) {
    console.error('Error fetching top revenue users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}
