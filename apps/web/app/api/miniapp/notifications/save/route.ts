import { NextRequest, NextResponse } from "next/server";
import User from "@/utils/schemas/User";
import dbConnect from "@/utils/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { socialId, notificationDetails } = body;

    console.log("Received data:", body);

    if (!socialId || !notificationDetails) {
      return NextResponse.json(
        { error: "Missing socialId or notificationDetails" },
        { status: 400 }
      );
    }

    console.log("Saving notification details for socialId:", socialId);
    console.log("Notification details:", notificationDetails);

    await dbConnect();

    const user = await User.findOneAndUpdate(
      { socialId: socialId },
      { 
        $set: { 
          notificationDetails: {
            url: notificationDetails.url,
            token: notificationDetails.token,
            appFid: notificationDetails.appFid
          }
        } 
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found. Please complete registration first.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving notification details:", error);
    return NextResponse.json(
      { error: "Failed to save notification details", details: error.message },
      { status: 500 }
    );
  }
}
