import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Whitelist from '@/utils/schemas/Whitelist';
import User from '@/utils/schemas/User';
import { verifyAccessToken } from '@/utils/privyAuth';

export async function POST(req: NextRequest) {
  try {
    // Verify Privy token and check admin status
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authorization.split(' ')[1];
    const claims = await verifyAccessToken(token);
    
    await dbConnect();
    
    // Get user and verify admin status
    const user = await User.findOne({ privyId: claims.userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.socialId === '666038' || user.socialId === '1129842';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { walletAddress, nickname } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Validate wallet address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Check if wallet already exists
    const existing = await Whitelist.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (existing) {
      return NextResponse.json({ error: 'Wallet address already whitelisted' }, { status: 409 });
    }

    const newWhitelist = new Whitelist({
      walletAddress: walletAddress.toLowerCase(),
      nickname: nickname || undefined,
      addedBy: 'admin', // Can be enhanced to get actual admin FID
      status: 'ACTIVE',
    });

    await newWhitelist.save();

    return NextResponse.json(
      { message: 'Wallet address added to whitelist', whitelist: newWhitelist },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding to whitelist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
