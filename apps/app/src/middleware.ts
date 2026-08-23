import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = process.env.COOKIE_NAME || "house_session";
const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:3001";

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

  // Protect profile — requires SIWE session, not social links
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
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
  matcher: ["/profile", "/profile/:path*"],
};
