import { NextRequest, NextResponse } from "next/server";
import connectDB from '@/utils/db';
import User from "@/utils/schemas/User";
import { getPrivyUser } from '@/lib/privy-server';

export async function GET(request: NextRequest) {
    try{
        const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
        
        if (!authToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const verifiedClaims = await getPrivyUser(authToken);
        
        if (!verifiedClaims) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB()

        const dbUser = await User.findOne({
            privyId: verifiedClaims.userId
        });

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