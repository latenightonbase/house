# MiniApp Notifications Implementation Guide

## ✅ What's Been Implemented

The following components have been successfully added to your auction house application:

### 1. **Database Schema Updates** (`utils/schemas/User.ts`)
- Added `notificationDetails` field to store:
  - `url`: Notification endpoint URL
  - `token`: Secret token for sending notifications
  - `appFid`: Client app identifier (Base app or Farcaster app)

### 2. **Webhook Endpoint** (`app/api/miniapp/notifications/route.ts`)
- Handles webhook events from Farcaster/Base apps
- Processes 4 event types:
  - `miniapp_added` - User adds your app
  - `miniapp_removed` - User removes your app
  - `notifications_enabled` - User enables notifications
  - `notifications_disabled` - User disables notifications
- Verifies webhook signatures using Neynar API
- Responds within 10 seconds to avoid timeouts

### 3. **Notification Utility** (`utils/sendNotification.ts`)
- `sendMiniAppNotification()` - Send notification to a single user
- `sendBulkMiniAppNotifications()` - Send to multiple users
- Validates character limits (title ≤32, body ≤128)
- Handles rate limiting and invalid tokens
- Automatically cleans up invalid tokens from database

### 4. **User Interface** (`components/Welcome.tsx`)
- "Enable Notifications" button for users to opt-in
- Shows notification status (enabled/disabled)
- Calls `sdk.actions.addMiniApp()` to trigger opt-in flow
- Toast notifications for success/error feedback

### 5. **Example Implementations** (`utils/notificationExamples.ts`)
- Ready-to-use functions for common auction events:
  - `notifyUserOutbid()` - When user is outbid
  - `notifyAuctionWon()` - When user wins
  - `notifyAuctionEnded()` - When auction concludes
  - `notifyHostNewBid()` - When auction receives bid
  - `notifyAuctionEndingSoon()` - Time-based alerts
  - `notifyAllParticipants()` - Batch notifications

---

## 🔧 Required Setup Steps

### Step 1: Update Your Hosted Manifest

Your app uses a hosted manifest. You need to add the webhook URL:

1. Go to [Farcaster Developer Console](https://dev.farcaster.xyz/)
2. Find your app (ID: `019a0f97-65c4-162f-d55f-34727e111e82`)
3. Add webhook URL to your manifest:
   ```json
   {
     "webhookUrl": "https://houseproto.fun/api/miniapp/notifications"
   }
   ```
4. Save and publish the updated manifest

**Verification:** Check that the redirect at `/.well-known/farcaster.json` returns the updated manifest.

### Step 2: Verify Environment Variables

Ensure your `.env` file has the required Neynar API key (already present):

```env
NEYNAR_API_KEY=F3FC9EA3-AD1C-4136-9494-EBBF5AFEE152
```

This is used to verify webhook signatures from Farcaster/Base apps.

### Step 3: Deploy the Changes

1. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Add MiniApp notification support"
   git push
   ```

2. **Deploy to production** (Vercel will auto-deploy from main branch)

3. **Verify deployment** by checking:
   - Webhook endpoint: `https://houseproto.fun/api/miniapp/notifications`
   - Should return 405 Method Not Allowed for GET requests (expected)

### Step 4: Test the Integration

1. **Open your MiniApp** in Base app or Farcaster
2. **Click "Enable Notifications"** button on home page
3. **Check your server logs** for:
   ```
   MiniApp added with notifications for FID: [user's FID]
   ```
4. **Verify database** - User document should have `notificationDetails` field

---

## 📱 How to Use Notifications

### Sending a Single Notification

```typescript
import { sendMiniAppNotification } from "@/utils/sendNotification";

// Example: Notify user they've been outbid
const result = await sendMiniAppNotification({
  fid: "12345", // User's Farcaster ID
  title: "You've been outbid!",
  body: "Someone placed a higher bid on 'Cool NFT Auction'",
  targetUrl: "https://farcaster.xyz/miniapps/0d5aS3cWVprk/house/bid/123",
});

if (result.state === "success") {
  console.log("Notification sent!");
} else if (result.state === "no_token") {
  console.log("User hasn't enabled notifications");
} else if (result.state === "rate_limit") {
  console.log("Rate limited, try again later");
}
```

### Character Limits
- **Title:** Max 32 characters
- **Body:** Max 128 characters
- **Target URL:** Max 1024 characters (must be same domain as MiniApp)

### Integration Points

Add notifications to your existing auction logic:

#### 1. When a Bid is Placed (`app/api/bid/[blockchainAuctionId]/route.ts`)

```typescript
import { notifyUserOutbid, notifyHostNewBid } from "@/utils/notificationExamples";

// After successful bid placement:
// Notify previous highest bidder
if (previousBidder?.fid) {
  await notifyUserOutbid(
    previousBidder.fid,
    auction.title,
    auction.blockchainAuctionId
  );
}

// Notify auction host
if (auctionHost?.fid) {
  await notifyHostNewBid(
    auctionHost.fid,
    auction.title,
    `${bidAmount} USDC`,
    auction.blockchainAuctionId
  );
}
```

#### 2. When Auction Ends (`scripts/mark-auctions-ended.ts`)

```typescript
import { notifyAuctionWon, notifyAuctionEnded } from "@/utils/notificationExamples";

// After determining winner:
if (winner?.fid) {
  await notifyAuctionWon(winner.fid, auction.title, auction.blockchainAuctionId);
}

// Notify all participants
for (const participant of auction.participants) {
  if (participant.fid && participant.fid !== winner.fid) {
    await notifyAuctionEnded(
      participant.fid,
      auction.title,
      auction.blockchainAuctionId
    );
  }
}
```

---

## 🔍 Troubleshooting

### "Failed to add mini app" Error
**Cause:** Webhook not responding within 10 seconds
**Solution:** 
- Check server logs for errors
- Ensure database connection is fast
- Webhook saves data synchronously before returning response

### Notifications Not Sending
**Checklist:**
1. User has `notificationDetails` in database?
2. Token hasn't been marked invalid?
3. Title/body within character limits?
4. Target URL uses correct domain?

### Webhook Not Receiving Events
**Checklist:**
1. Manifest includes `webhookUrl`?
2. Webhook endpoint is publicly accessible?
3. NEYNAR_API_KEY is set correctly?
4. Server logs show verification errors?

### Testing Locally
For local development, use a tunneling service:
```bash
# Using ngrok
ngrok http 3000

# Update manifest temporarily
"webhookUrl": "https://your-ngrok-url.ngrok.io/api/miniapp/notifications"
```

---

## 📊 Rate Limits

Farcaster enforces rate limits on notifications:
- **Per user:** Avoid sending too many notifications to same user
- **Per app:** System-wide rate limits apply
- The `sendNotification` function handles `rateLimitedTokens` automatically

**Best Practice:** Batch notifications and add delays between batches:
```typescript
// From notificationExamples.ts
for (let i = 0; i < notifications.length; i += batchSize) {
  const batch = notifications.slice(i, i + batchSize);
  await Promise.allSettled(batch.map(n => sendMiniAppNotification(n)));
  // Optional: await delay(1000); // 1 second between batches
}
```

---

## 🎯 Next Steps

1. **Update manifest** with webhook URL (Required)
2. **Deploy to production** 
3. **Test with real users** - Ask beta testers to enable notifications
4. **Integrate notifications** into your auction event handlers
5. **Monitor logs** for webhook events and notification sends
6. **Consider implementing**:
   - Time-based notifications (auction ending soon)
   - Daily digests for active bidders
   - Milestone notifications (100th auction, etc.)

---

## 📚 Additional Resources

- [Farcaster MiniApp Docs](https://docs.farcaster.xyz/miniapps/notifications)
- [Base MiniApp Guide](https://docs.base.org/miniapps)
- [Neynar API Docs](https://docs.neynar.com/)

---

## 💡 Pro Tips

1. **User Experience:** Don't over-notify. Users can disable notifications if annoyed.
2. **Timing:** Send notifications when users are most likely to engage (e.g., right after being outbid).
3. **Content:** Keep titles punchy and bodies informative. Use emojis sparingly.
4. **Deep Links:** Always include relevant `targetUrl` to drive users back to specific pages.
5. **Testing:** Test with multiple FIDs on both Base app and Farcaster app (separate tokens).

---

## ❓ Questions?

If you encounter issues:
1. Check server logs for webhook/notification errors
2. Verify user has `notificationDetails` in database
3. Test webhook endpoint manually with curl/Postman
4. Ensure manifest is updated and deployed

Good luck with your auction house notifications! 🎉
