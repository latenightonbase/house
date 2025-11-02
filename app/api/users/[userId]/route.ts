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

    // Try to find user by wallet address first, then by ID
    let user: any = await User.findOne({ wallet: userId })
      .select('wallet fid username')
      .lean();

    if (!user) {
      // If not found by wallet, try by MongoDB ID
      user = await User.findById(userId)
        .select('wallet fid username')
        .lean();
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        _id: user._id,
        wallet: user.wallet,
        fid: user.fid,
        username: user.username,
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}