import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Whitelist from '@/utils/schemas/Whitelist';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    await dbConnect();

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
