import { NextRequest } from "next/server";

export async function POST(req:NextRequest) {
  const walletType = req.headers.get("x-warpcast-wallet-type");

  return Response.json({ walletType: walletType || "LMAOOO" });
}
