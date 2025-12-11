import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './privyAuth';

export async function authenticateRequest(req: NextRequest): Promise<{ success: true; userId: string } | { success: false; response: NextResponse }> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    console.log("❌ Authentication failed - no token");
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    };
  }

  try {
    const claims = await verifyAccessToken(token);
    console.log("✅ Authentication successful:", claims.userId);
    return {
      success: true,
      userId: claims.userId
    };
  } catch (error) {
    console.log("❌ Authentication failed - invalid token");
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    };
  }
}
