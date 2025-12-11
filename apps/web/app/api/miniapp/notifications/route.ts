import { NextRequest, NextResponse } from "next/server";
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/miniapp-node";
import connectToDB from "@/utils/db";
import User from "@/utils/schemas/User";

export async function POST(request: NextRequest) {
  try {
    const requestJson = await request.json();

    // Parse and verify the webhook event
    let data;
    try {
      data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
    } catch (e: unknown) {
      console.error("Webhook verification failed:", e);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const fid = data.fid;
    const appFid = data.appFid;
    const event = data.event;

    // Connect to database
    await connectToDB();

    // Handle different event types
    switch (event.event) {
      case "miniapp_added":
        if (event.notificationDetails) {
          // Save notification details when miniapp is added
          await User.findOneAndUpdate(
            { fid: fid.toString() },
            {
              $set: {
                notificationDetails: {
                  url: event.notificationDetails.url,
                  token: event.notificationDetails.token,
                  appFid: appFid.toString(),
                },
              },
            },
            { upsert: false }
          );
          
          console.log(`MiniApp added with notifications for FID: ${fid}`);
        }
        break;

      case "miniapp_removed":
        // Delete notification details when miniapp is removed
        await User.findOneAndUpdate(
          { fid: fid.toString() },
          {
            $unset: { notificationDetails: "" },
          }
        );
        
        console.log(`MiniApp removed for FID: ${fid}`);
        break;

      case "notifications_enabled":
        if (event.notificationDetails) {
          // Update notification details when enabled
          await User.findOneAndUpdate(
            { fid: fid.toString() },
            {
              $set: {
                notificationDetails: {
                  url: event.notificationDetails.url,
                  token: event.notificationDetails.token,
                  appFid: appFid.toString(),
                },
              },
            },
            { upsert: false }
          );
          
          console.log(`Notifications enabled for FID: ${fid}`);
        }
        break;

      case "notifications_disabled":
        // Delete notification details when disabled
        await User.findOneAndUpdate(
          { fid: fid.toString() },
          {
            $unset: { notificationDetails: "" },
          }
        );
        
        console.log(`Notifications disabled for FID: ${fid}`);
        break;

      default:
        console.log(`Unknown event type received`);
    }

    // Return success response quickly (under 10 seconds)
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
