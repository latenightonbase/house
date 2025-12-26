import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@farcaster/quick-auth";

export async function middleware(request: NextRequest) {
  let authorization;

  const env = process.env.NEXT_PUBLIC_ENV;
  const client = createClient();
  if (env == "DEV") {
    authorization = `Bearer ${process.env.DEV_HEADER as string}`;
  } else {
    authorization = request.headers.get("Authorization");
  }

  if (!authorization) {
    return NextResponse.json({ status: 401, statusText: "Unauthorized" });
  }

  const payload = await client.verifyJwt({
    token: authorization?.split(" ")[1] as string,
    domain: process.env.HOSTNAME as string,
  });

  console.log("JWT payload:", payload);

  const fidParam = payload.sub;
  if (!fidParam) {
    return NextResponse.json(
      { error: "Missing fid parameter" },
      { status: 401 }
    );
  }

  const fid = Number(fidParam);

  if (Number.isNaN(fid) || (fid !== 666038 && fid !== 1129842)) {
    return NextResponse.json(
      { error: "Invalid fid parameter" },
      { status: 401 }
    );
  }

  // Create a new response with modified headers
  return NextResponse.next();
}

export const config = {
  matcher: "/api/admin/:path*",
};
