import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware runs in Edge Runtime - can't use Mongoose/database
// Only verify token format here, admin check happens in API routes
export async function middleware(request: NextRequest) {
  const authorization = request.headers.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  // Just pass through - API routes will verify the Privy token and check admin status
  return NextResponse.next();
}

export const config = {
  matcher: "/api/admin/:path*",
};
