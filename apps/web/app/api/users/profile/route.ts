import { NextRequest, NextResponse } from "next/server";
import connectDB from '@/utils/db';
import User from "@/utils/schemas/User";
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
        }).select('_id wallets username socialId socialPlatform fid twitterProfile hostedAuctions bidsWon participatedAuctions createdAt averageRating totalReviews');

        console.log('DB User', dbUser);

        return NextResponse.json({
            success: true,
            user: dbUser
        },{status:200});
    }
    catch(error){
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}