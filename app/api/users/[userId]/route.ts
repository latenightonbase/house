import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import User from '@/utils/schemas/User';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB();

    const { userId } = await params;

    // Try to find user by wallet address, fid, or ID
    let user: any = await User.findOne({ 
      $or: [
        { wallet: userId },
        { fid: userId }
      ]
    })
      .select('wallet fid username twitterProfile notificationDetails')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}