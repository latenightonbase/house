import { authOptions } from "@/utils/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import connectDB from '@/utils/db';
import User from "@/utils/schemas/User";

export async function GET(request: NextRequest) {
    try{
        const session = await getServerSession(authOptions);

        if(!session){
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB()

        const dbUser = await User.findOne({
            wallet: session.user?.wallet
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