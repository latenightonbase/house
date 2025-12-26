import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Whitelist from '@/utils/schemas/Whitelist';
import User from '@/utils/schemas/User';
import { verifyAccessToken } from '@/utils/privyAuth';

export async function PATCH(req: NextRequest) {
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
    const { walletAddress, nickname, status } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (nickname !== undefined) {
      updateData.nickname = nickname;
    }
    if (status && (status === 'ACTIVE' || status === 'INACTIVE')) {
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await Whitelist.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Wallet address not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Whitelist entry updated', whitelist: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating whitelist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
