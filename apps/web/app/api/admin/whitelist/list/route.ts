import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Whitelist from '@/utils/schemas/Whitelist';

export async function GET(req: NextRequest) {
  try {
    console.log('Fetching whitelist entries');
    await dbConnect();

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
