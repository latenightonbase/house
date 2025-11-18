import { NextRequest, NextResponse } from "next/server";
import User from "@/utils/schemas/User";
import dbConnect from "@/utils/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, notificationDetails } = body;

    if (!wallet || !notificationDetails) {
      return NextResponse.json(
        { error: "Missing wallet or notificationDetails" },
        { status: 400 }
      );
    }

    console.log("Saving notification details for wallet:", wallet);
    console.log("Notification details:", notificationDetails);

    await dbConnect();

    const user = await User.findOneAndUpdate(
      { wallet: wallet.toLowerCase() },
      { 
        $set: { 
          notificationDetails: {
            url: notificationDetails.url,
            token: notificationDetails.token,
            appFid: notificationDetails.appFid
          }
        } 
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving notification details:", error);
    return NextResponse.json(
      { error: "Failed to save notification details", details: error.message },
      { status: 500 }
    );
  }
}
