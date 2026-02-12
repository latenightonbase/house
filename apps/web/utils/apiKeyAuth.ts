import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from './apiKeyService';
import User from './schemas/User';
import BotWallet from './schemas/BotWallet';

export interface ApiKeyAuthResult {
  success: true;
  user: InstanceType<typeof User>;
  botWallet: InstanceType<typeof BotWallet>;
  apiKeyId: string;
}

export interface ApiKeyAuthError {
  success: false;
  response: NextResponse;
}

/**
 * Authenticate a request using an API key from the x-api-key header.
 * Returns the associated user and bot wallet on success.
 */
export async function authenticateApiKeyRequest(
  req: NextRequest
): Promise<ApiKeyAuthResult | ApiKeyAuthError> {
  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized - No API key provided. Use x-api-key header.' },
        { status: 401 }
      ),
    };
  }

  const result = await validateApiKey(apiKey);

  if (!result) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Invalid or revoked API key' },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    user: result.user,
    botWallet: result.botWallet,
    apiKeyId: result.apiKeyId,
  };
}
