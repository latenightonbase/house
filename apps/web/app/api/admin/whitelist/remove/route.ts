import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Whitelist from '@/utils/schemas/Whitelist';
import User from '@/utils/schemas/User';
import { verifyAccessToken } from '@/utils/privyAuth';

export async function DELETE(req: NextRequest) {
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
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const deleted = await Whitelist.findOneAndDelete({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Wallet address not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Wallet address removed from whitelist', whitelist: deleted },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing from whitelist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
