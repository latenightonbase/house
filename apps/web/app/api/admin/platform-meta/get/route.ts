import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import PlatformMeta from '@/utils/schemas/PlatformMeta';
import User from '@/utils/schemas/User';
import { verifyAccessToken } from '@/utils/privyAuth';

export async function GET(req: NextRequest) {
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

    // Get platform meta (singleton document)
    const platformMeta = await PlatformMeta.findOne();

    // Return 0 if no document exists yet
    const minTokenRequired = platformMeta?.minTokenRequired ?? 0;

    return NextResponse.json(
      { minTokenRequired },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching platform meta:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
