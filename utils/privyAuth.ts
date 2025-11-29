import * as jose from 'jose';

const PRIVY_APP_ID = 'cmggt86he00kmjy0crv42kfso';
const PRIVY_VERIFICATION_KEY = process.env.PRIVY_VERIFICATION_KEY;

export interface AccessTokenClaims {
  appId: string;
  userId: string;
  issuer: string;
  issuedAt: number;
  expiration: number;
  sessionId: string;
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  if (!PRIVY_VERIFICATION_KEY) {
    throw new Error('PRIVY_VERIFICATION_KEY environment variable is not set');
  }

  try {
    const verificationKey = await jose.importSPKI(
      PRIVY_VERIFICATION_KEY,
      'ES256'
    );

    const { payload } = await jose.jwtVerify(token, verificationKey, {
      issuer: 'privy.io',
      audience: PRIVY_APP_ID,
    });

    return {
      appId: payload.aud as string,
      userId: payload.sub as string,
      issuer: payload.iss as string,
      issuedAt: payload.iat as number,
      expiration: payload.exp as number,
      sessionId: payload.sid as string,
    };
  } catch (error) {
    throw new Error(`Invalid access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
