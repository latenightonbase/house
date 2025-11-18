/**
 * Example implementations for sending notifications at key auction events
 * Import and use these functions in your auction-related API routes
 */

import { sendMiniAppNotification } from "./sendNotification";

/**
 * Send notification when a user is outbid on an auction
 * Call this when a new bid is placed on an auction
 */
export async function notifyUserOutbid(
  previousBidderFid: string,
  auctionTitle: string,
  auctionId: string
) {
  await sendMiniAppNotification({
    fid: previousBidderFid,
    title: "You've been outbid!",
    body: `Someone placed a higher bid on "${auctionTitle}"`,
    targetUrl: `${process.env.NEXT_PUBLIC_MINIAPP_URL}/bid/${auctionId}`,
  });
}

/**
 * Send notification when a user wins an auction
 * Call this when an auction ends and a winner is determined
 */
export async function notifyAuctionWon(
  winnerFid: string,
  auctionTitle: string,
  auctionId: string
) {
  await sendMiniAppNotification({
    fid: winnerFid,
    title: "🎉 Congratulations!",
    body: `You won the auction: "${auctionTitle}"`,
    targetUrl: `${process.env.NEXT_PUBLIC_MINIAPP_URL}/won-bids`,
  });
}

/**
 * Send notification when an auction the user participated in ends
 * Call this for all participants when auction concludes
 */
export async function notifyAuctionEnded(
  participantFid: string,
  auctionTitle: string,
  auctionId: string
) {
  await sendMiniAppNotification({
    fid: participantFid,
    title: "Auction Ended",
    body: `The auction "${auctionTitle}" has concluded`,
    targetUrl: `${process.env.NEXT_PUBLIC_MINIAPP_URL}/bid/${auctionId}`,
  });
}

/**
 * Send notification when a user's hosted auction receives a new bid
 * Call this when someone bids on an auction
 */
export async function notifyHostNewBid(
  hostFid: string,
  auctionTitle: string,
  bidAmount: string,
  auctionId: string
) {
  await sendMiniAppNotification({
    fid: hostFid,
    title: "New bid on your auction!",
    body: `${bidAmount} bid on "${auctionTitle}"`,
    targetUrl: `${process.env.NEXT_PUBLIC_MINIAPP_URL}/my-auctions`,
  });
}

/**
 * Send notification when an auction is about to end (e.g., 1 hour warning)
 * Call this from a scheduled job/cron
 */
export async function notifyAuctionEndingSoon(
  participantFid: string,
  auctionTitle: string,
  timeRemaining: string,
  auctionId: string
) {
  await sendMiniAppNotification({
    fid: participantFid,
    title: "Auction ending soon!",
    body: `"${auctionTitle}" ends in ${timeRemaining}`,
    targetUrl: `${process.env.NEXT_PUBLIC_MINIAPP_URL}/bid/${auctionId}`,
  });
}

/**
 * Example: Send notification to all auction participants
 * Use this pattern to notify multiple users at once
 */
export async function notifyAllParticipants(
  participantFids: string[],
  auctionTitle: string,
  auctionId: string
) {
  const notifications = participantFids.map((fid) => ({
    fid,
    title: "Auction Update",
    body: `Update on "${auctionTitle}"`,
    targetUrl: `${process.env.NEXT_PUBLIC_MINIAPP_URL}/bid/${auctionId}`,
  }));

  // Send in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map((notif) => sendMiniAppNotification(notif))
    );
  }
}
