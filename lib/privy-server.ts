import { PrivyClient } from '@privy-io/server-auth';

export const privyServer = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

export async function getPrivyUser(authToken: string) {
  try {
    const verifiedClaims = await privyServer.verifyAuthToken(authToken);
    return verifiedClaims;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
