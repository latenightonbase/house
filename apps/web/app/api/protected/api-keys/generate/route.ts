import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/utils/authService';
import { createApiKeyAndWallet } from '@/utils/apiKeyService';
import dbConnect from '@/utils/db';
import User from '@/utils/schemas/User';

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    await dbConnect();

    // Find user by privyId
    const user = await User.findOne({ privyId: authResult.userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const keyName = body.name || 'Default';

    const result = await createApiKeyAndWallet(user._id.toString(), keyName);

    return NextResponse.json(
      {
        message: 'API key created successfully',
        apiKey: result.apiKey, // Only shown once
        keyPrefix: result.keyPrefix,
        walletAddress: result.walletAddress,
        keyId: result.keyId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating API key:', error);
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500 }
    );
  }
}
