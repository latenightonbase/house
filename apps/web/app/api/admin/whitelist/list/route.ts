import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Whitelist from '@/utils/schemas/Whitelist';
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

    console.log('Fetching whitelist entries');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = {};
    if (status && (status === 'ACTIVE' || status === 'INACTIVE')) {
      query = { status };
    }

    const whitelists = await Whitelist.find(query).sort({ createdAt: -1 });

    console.log(`Fetched ${whitelists.length} whitelist entries`);

    return NextResponse.json(
      { whitelists, count: whitelists.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching whitelists:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
