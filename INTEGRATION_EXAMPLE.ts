/**
 * INTEGRATION EXAMPLE: Adding Notifications to Bid Route
 * 
 * This shows how to integrate the notification system into your existing bid processing.
 * Copy the relevant parts into your actual route file: app/api/bid/[blockchainAuctionId]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { notifyUserOutbid, notifyHostNewBid } from '@/utils/notificationExamples';

export async function POST(req: NextRequest) {
  try {
    // ... your existing bid processing code ...

    const blockchainAuctionId = req.nextUrl.pathname.split('/')[3];
    const { contractBidders } = await req.json();

    // Find auction and process bidders
    const auction = await Auction.findOne({ blockchainAuctionId });
    
    // After processing new bids, get the previous highest bidder
    const sortedBidders = contractBidders.sort((a: any, b: any) => 
      parseFloat(b.bidAmount) - parseFloat(a.bidAmount)
    );
    
    const newHighestBid = sortedBidders[0];
    const previousHighestBid = sortedBidders[1];

    // ✨ NOTIFICATION INTEGRATION POINTS ✨

    // 1. Notify previous highest bidder they've been outbid
    if (previousHighestBid?.fid && previousHighestBid.fid !== newHighestBid.fid) {
      try {
        await notifyUserOutbid(
          previousHighestBid.fid,
          auction.title,
          blockchainAuctionId
        );
        console.log(`Notified FID ${previousHighestBid.fid} about being outbid`);
      } catch (error) {
        console.error('Failed to send outbid notification:', error);
        // Don't fail the request if notification fails
      }
    }

    // 2. Notify auction host about new bid
    if (auction.host?.fid) {
      try {
        const bidAmountFormatted = `${parseFloat(newHighestBid.bidAmount).toFixed(2)} USDC`;
        await notifyHostNewBid(
          auction.host.fid,
          auction.title,
          bidAmountFormatted,
          blockchainAuctionId
        );
        console.log(`Notified host FID ${auction.host.fid} about new bid`);
      } catch (error) {
        console.error('Failed to send host notification:', error);
      }
    }

    // ... rest of your existing code ...

    return NextResponse.json({ success: true, auction });
  } catch (error) {
    console.error('Error processing bid:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * IMPORTANT NOTES:
 * 
 * 1. Import the notification functions at the top of your route file:
 *    import { notifyUserOutbid, notifyHostNewBid } from '@/utils/notificationExamples';
 * 
 * 2. Always wrap notification calls in try-catch to prevent them from breaking your main logic
 * 
 * 3. Make sure you have the FID available for users. Check your User schema has the 'fid' field
 * 
 * 4. The notifications are fire-and-forget - they run async but don't block the response
 * 
 * 5. Test with real FIDs that have notifications enabled (notificationDetails in User document)
 * 
 * 6. Monitor your server logs to see if notifications are being sent successfully
 */

/**
 * TESTING CHECKLIST:
 * 
 * □ User has enabled notifications (notificationDetails exists in database)
 * □ User FID is being captured correctly when bids are placed
 * □ Auction host FID is stored in auction document
 * □ Webhook endpoint is live and responding
 * □ Manifest includes webhook URL
 * □ NEYNAR_API_KEY is set in environment variables
 * □ Server logs show successful notification sends
 */
