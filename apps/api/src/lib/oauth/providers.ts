import { createHash, randomBytes } from "crypto";
import type { OAuthProvider, OAuthTokens, SocialProfile } from "./types";

function base64Url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const youtubeProvider: OAuthProvider = {
  platform: "YOUTUBE",

  isConfigured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  },

  getAuthorizeUrl({ state, redirectUri }) {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube token exchange failed: ${text}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scope,
    };
  },

  async fetchProfile(tokens: OAuthTokens): Promise<SocialProfile> {
    const url =
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`YouTube profile fetch failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        snippet?: { title?: string; customUrl?: string; thumbnails?: { default?: { url?: string } } };
        statistics?: { subscriberCount?: string };
      }>;
    };
    const channel = data.items?.[0];
    if (!channel) {
      throw new Error("No YouTube channel found for this Google account");
    }
    return {
      platformUserId: channel.id,
      username: channel.snippet?.customUrl?.replace(/^@/, "") || channel.snippet?.title,
      displayName: channel.snippet?.title,
      avatarUrl: channel.snippet?.thumbnails?.default?.url,
      followerCount: channel.statistics?.subscriberCount
        ? Number(channel.statistics.subscriberCount)
        : undefined,
    };
  },

  async refreshTokens(refreshToken: string) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      throw new Error(`YouTube token refresh failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scope,
    };
  },
};

export const twitterProvider: OAuthProvider = {
  platform: "TWITTER",

  isConfigured() {
    return Boolean(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET);
  },

  createPkce() {
    const codeVerifier = base64Url(randomBytes(32));
    const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
    return { codeVerifier, codeChallenge };
  },

  getAuthorizeUrl({ state, redirectUri, codeVerifier }) {
    if (!codeVerifier) throw new Error("Twitter OAuth requires PKCE code_verifier");
    const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.TWITTER_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: "tweet.read users.read offline.access",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  },

  async exchangeCode({ code, redirectUri, codeVerifier }) {
    if (!codeVerifier) throw new Error("Missing PKCE code_verifier");
    const basic = Buffer.from(
      `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`,
    ).toString("base64");
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    if (!res.ok) {
      throw new Error(`Twitter token exchange failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scope,
    };
  },

  async fetchProfile(tokens: OAuthTokens): Promise<SocialProfile> {
    const res = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url,name,username",
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    if (!res.ok) {
      throw new Error(`Twitter profile fetch failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      data?: {
        id: string;
        username?: string;
        name?: string;
        profile_image_url?: string;
        public_metrics?: { followers_count?: number };
      };
    };
    if (!data.data) throw new Error("Twitter user not found");
    return {
      platformUserId: data.data.id,
      username: data.data.username,
      displayName: data.data.name,
      avatarUrl: data.data.profile_image_url,
      followerCount: data.data.public_metrics?.followers_count,
    };
  },

  async refreshTokens(refreshToken: string) {
    const basic = Buffer.from(
      `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`,
    ).toString("base64");
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      throw new Error(`Twitter token refresh failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scope,
    };
  },
};

export const instagramProvider: OAuthProvider = {
  platform: "INSTAGRAM",

  isConfigured() {
    return Boolean(
      process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET,
    );
  },

  getAuthorizeUrl({ state, redirectUri }) {
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "instagram_business_basic",
      state,
    });
    return `https://www.instagram.com/oauth/authorize?${params}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const res = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    if (!res.ok) {
      throw new Error(`Instagram token exchange failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      user_id?: number | string;
      permissions?: string[];
    };

    // Exchange short-lived for long-lived token
    const ll = await fetch(
      `https://graph.instagram.com/access_token?${new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        access_token: data.access_token,
      })}`,
    );
    let accessToken = data.access_token;
    let expiresAt: Date | undefined;
    if (ll.ok) {
      const llData = (await ll.json()) as {
        access_token: string;
        expires_in?: number;
      };
      accessToken = llData.access_token;
      expiresAt = llData.expires_in
        ? new Date(Date.now() + llData.expires_in * 1000)
        : undefined;
    }

    return {
      accessToken,
      expiresAt,
      scopes: data.permissions?.join(" "),
    };
  },

  async fetchProfile(tokens: OAuthTokens): Promise<SocialProfile> {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=user_id,username,name,profile_picture_url,followers_count&access_token=${encodeURIComponent(tokens.accessToken)}`,
    );
    if (!res.ok) {
      throw new Error(`Instagram profile fetch failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      user_id?: string;
      id?: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
      followers_count?: number;
    };
    const id = data.user_id || data.id;
    if (!id) throw new Error("Instagram user id missing");
    return {
      platformUserId: String(id),
      username: data.username,
      displayName: data.name || data.username,
      avatarUrl: data.profile_picture_url,
      followerCount: data.followers_count,
    };
  },

  async refreshTokens(refreshToken: string) {
    // Instagram long-lived tokens refresh via the same token as "refresh"
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: refreshToken,
      })}`,
    );
    if (!res.ok) {
      throw new Error(`Instagram token refresh failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      expires_in?: number;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  },
};

export const tiktokProvider: OAuthProvider = {
  platform: "TIKTOK",

  isConfigured() {
    return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
  },

  createPkce() {
    const codeVerifier = base64Url(randomBytes(32));
    const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
    return { codeVerifier, codeChallenge };
  },

  getAuthorizeUrl({ state, redirectUri, codeVerifier }) {
    if (!codeVerifier) throw new Error("TikTok OAuth requires PKCE");
    const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      response_type: "code",
      scope: "user.info.basic,user.info.stats",
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  },

  async exchangeCode({ code, redirectUri, codeVerifier }) {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`TikTok token exchange failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (!data.access_token) {
      throw new Error(
        `TikTok token exchange failed: ${data.error_description || data.error || "unknown"}`,
      );
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scope,
    };
  },

  async fetchProfile(tokens: OAuthTokens): Promise<SocialProfile> {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count",
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      },
    );
    if (!res.ok) {
      throw new Error(`TikTok profile fetch failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      data?: {
        user?: {
          open_id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string;
          follower_count?: number;
        };
      };
    };
    const user = data.data?.user;
    if (!user?.open_id) throw new Error("TikTok user not found");
    return {
      platformUserId: user.open_id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      followerCount: user.follower_count,
    };
  },

  async refreshTokens(refreshToken: string) {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) {
      throw new Error(`TikTok token refresh failed: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!data.access_token) throw new Error("TikTok refresh returned no access_token");
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scope,
    };
  },
};
