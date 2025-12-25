import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Whitelist from '@/utils/schemas/Whitelist';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, nickname, status } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    await dbConnect();

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
