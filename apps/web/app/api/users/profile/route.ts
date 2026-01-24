import { NextRequest, NextResponse } from "next/server";
import connectDB from '@/utils/db';
import User from "@/utils/schemas/User";
import Auction from "@/utils/schemas/Auction";
import { verifyAccessToken } from '@/utils/privyAuth';
import { authenticateRequest } from "@/utils/authService";

export async function GET(request: NextRequest) {
    try{

        console.log('Profile fetch request received');

        const authResult = await authenticateRequest(request);
            if (!authResult.success) {
              return authResult.response;
            }

        //get socialId from query params
        const socialId = request.nextUrl.searchParams.get("socialId");

        console.log('Fetching profile for socialId:', socialId);
        
        await connectDB()

        const dbUser = await User.findOne({
            socialId: socialId
        }).select('_id wallets username socialId socialPlatform fid twitterProfile hostedAuctions bidsWon participatedAuctions createdAt averageRating totalReviews notificationDetails pfp_url display_name');

        console.log('DB User', dbUser);

        // Calculate trading volume (revenue from hosted auctions)
        let totalTradingVolume = 0;
        let activeAuctions = 0;
        let totalBids = 0;

        if (dbUser) {
            // Get trading volume from ended auctions
            const revenueData = await Auction.aggregate([
                {
                    $match: {
                        hostedBy: dbUser._id,
                        status: 'ended',
                        bidders: { $exists: true, $ne: [] }
                    }
                },
                {
                    $addFields: {
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
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$calculatedRevenue' }
                    }
                }
            ]);

            totalTradingVolume = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

            // Count active auctions
            activeAuctions = await Auction.countDocuments({
                hostedBy: dbUser._id,
                status: 'ongoing'
            });

            // Count total bids across all auctions
            const bidData = await Auction.aggregate([
                {
                    $match: {
                        hostedBy: dbUser._id
                    }
                },
                {
                    $project: {
                        bidCount: { $size: { $ifNull: ['$bidders', []] } }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalBids: { $sum: '$bidCount' }
                    }
                }
            ]);

            totalBids = bidData.length > 0 ? bidData[0].totalBids : 0;
        }

        return NextResponse.json({
            success: true,
            user: dbUser,
            statistics: {
                totalTradingVolume,
                activeAuctions,
                totalBids
            }
        },{status:200});
    }
    catch(error){
        console.error('Profile error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}