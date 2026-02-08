import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/utils/authService";
import { awardDailyLoginXP } from "@/utils/xpService";
import User from "@/utils/schemas/User";
import dbConnect from "@/utils/db";

export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { userId } = authResult;

    console.log(`Authenticated user ID: ${userId} - processing daily login XP award.`);

    // Connect to database
    await dbConnect();

    // Find user by privyId
    const user = await User.findOne({ privyId: userId });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Award daily login XP
    const result = await awardDailyLoginXP(user._id);

    if (result.awarded) {
      return NextResponse.json(
        {
          success: true,
          awarded: true,
          xp: result.xp,
          nextRewardDate: result.nextRewardDate,
          message: `You earned ${result.xp} XP for logging in today!`,
        },
        { status: 200 }
      );
    } else if (result.alreadyClaimedToday) {
      return NextResponse.json(
        {
          success: true,
          awarded: false,
          alreadyClaimedToday: true,
          nextRewardDate: result.nextRewardDate,
          message: "Daily login reward already claimed today",
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          awarded: false,
          error: result.error || "Failed to award daily login XP",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in daily login endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
