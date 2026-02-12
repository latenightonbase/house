import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/utils/authService';
import { listApiKeys, revokeApiKey } from '@/utils/apiKeyService';
import dbConnect from '@/utils/db';
import User from '@/utils/schemas/User';

// GET: List all API keys for the authenticated user
export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    await dbConnect();

    const user = await User.findOne({ privyId: authResult.userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const keys = await listApiKeys(user._id.toString());

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error listing API keys:', error);
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 }
    );
  }
}

// DELETE: Revoke an API key
export async function DELETE(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    await dbConnect();

    const user = await User.findOne({ privyId: authResult.userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { keyId } = await req.json();
    if (!keyId) {
      return NextResponse.json({ error: 'keyId is required' }, { status: 400 });
    }

    const revoked = await revokeApiKey(keyId, user._id.toString());

    if (!revoked) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
