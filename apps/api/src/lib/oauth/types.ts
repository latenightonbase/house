export type SocialPlatformName = "YOUTUBE" | "TWITTER" | "INSTAGRAM" | "TIKTOK";

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string;
};

export type SocialProfile = {
  platformUserId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  followerCount?: number;
};

export type OAuthProvider = {
  platform: SocialPlatformName;
  isConfigured: () => boolean;
  getAuthorizeUrl: (params: {
    state: string;
    redirectUri: string;
    codeVerifier?: string;
  }) => string;
  /** PKCE: return a code_verifier to store with OAuthState */
  createPkce?: () => { codeVerifier: string; codeChallenge: string };
  exchangeCode: (params: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }) => Promise<OAuthTokens>;
  fetchProfile: (tokens: OAuthTokens) => Promise<SocialProfile>;
  refreshTokens?: (refreshToken: string) => Promise<OAuthTokens>;
};

export function requireConfigured(provider: OAuthProvider) {
  if (!provider.isConfigured()) {
    throw new Error(
      `${provider.platform} OAuth is not configured. Set the required env vars.`,
    );
  }
}

export function callbackUrl(platform: string) {
  const apiOrigin = process.env.API_ORIGIN || "http://localhost:3001";
  return `${apiOrigin}/socials/${platform.toLowerCase()}/callback`;
}
