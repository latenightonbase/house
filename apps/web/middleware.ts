import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/utils/privyAuth";
import dbConnect from "@/utils/db";
import User from "@/utils/schemas/User";

export async function middleware(request: NextRequest) {
  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authorization.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Invalid authorization format" },
        { status: 401 }
      );
    }

    // Verify the Privy access token
    const claims = await verifyAccessToken(token);
    console.log("Privy claims:", claims);

    // Get user from database to check admin status
    await dbConnect();
    const user = await User.findOne({ privyId: claims.userId });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is admin (using socialId/FID)
    const isAdmin = user.socialId === "666038" || user.socialId === "1129842";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    console.log("Admin access granted for user:", user.socialId);

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.json(
      { error: "Authentication failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: "/api/admin/:path*",
};
