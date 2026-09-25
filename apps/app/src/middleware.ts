import { NextResponse, type NextRequest } from "next/server";
import { getApiOrigin } from "@/lib/api-origin";

const COOKIE_NAME = process.env.COOKIE_NAME || "house_session";
const API_ORIGIN = getApiOrigin();

/**
 * Auth is SIWE session only (house_session cookie from RainbowKit → API).
 * Social OAuth is not auth — those routes stay API-gated by the same session.
 */
async function isSiweSessionValid(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_ORIGIN}/auth/me`, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dashboard, the private profile, messages, and the admin review queue all
  // need a SIWE session. The admin pages check the role themselves — this only
  // keeps signed-out traffic out. The public profile at /user/[userid] is
  // deliberately absent: anyone may read it.
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname.startsWith("/admin")
  ) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "required");
      return NextResponse.redirect(url);
    }

    const valid = await isSiweSessionValid(token);
    if (!valid) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "required");
      const res = NextResponse.redirect(url);
      res.cookies.set(COOKIE_NAME, "", { path: "/", expires: new Date(0) });
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/profile",
    "/profile/:path*",
    "/chat",
    "/chat/:path*",
    "/admin/:path*",
  ],
};
