import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Whitelist from '@/utils/schemas/Whitelist';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, nickname } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Validate wallet address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    await dbConnect();

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
