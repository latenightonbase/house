import { NextRequest, NextResponse } from 'next/server';
import User from '@/utils/schemas/User';
import dbConnect from '@/utils/db';
import { authenticateRequest } from '@/utils/authService';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { walletAddress, socialId } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOneAndUpdate(
      { socialId: socialId },
      {
        $addToSet: { wallets: walletAddress }
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      wallets: user.wallets
    });

  } catch (error) {
    console.error('Error adding wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
