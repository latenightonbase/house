import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/utils/db'
import Bid from '@/utils/schemas/Bid'
import { authenticateRequest } from '@/utils/authService'

export async function GET(request: NextRequest) {
  try {
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!authToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
const authResult = await authenticateRequest(request);
            if (!authResult.success) {
              return authResult.response;
            }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 })
    }

    await connectDB()

    const bids = await Bid.find({ user: userId })
      .sort({ bidTimestamp: -1 })
      .limit(limit)
      .populate('auction', 'auctionName blockchainAuctionId imageUrls')
      .lean()

    return NextResponse.json({ success: true, bids })
  } catch (error) {
    console.error('Error fetching user bids:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch bids' }, { status: 500 })
  }
}
