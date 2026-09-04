import { Elysia } from "elysia";
import { SocialPlatform } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "../db";
import { encrypt, decrypt } from "../lib/crypto";
import {
  getCookieName,
  getUserFromSessionToken,
  parseCookie,
  publicUser,
} from "../lib/session";
import {
  youtubeProvider,
  twitterProvider,
  instagramProvider,
  tiktokProvider,
} from "../lib/oauth/providers";
import {
  callbackUrl,
  requireConfigured,
  type OAuthProvider,
  type SocialPlatformName,
} from "../lib/oauth/types";
import { getCanonicalOrigin } from "../lib/origins";

const providers: Record<SocialPlatformName, OAuthProvider> = {
  YOUTUBE: youtubeProvider,
  TWITTER: twitterProvider,
  INSTAGRAM: instagramProvider,
  TIKTOK: tiktokProvider,
};

const OAUTH_STATE_TTL_MS = 1000 * 60 * 15;

function parsePlatform(raw: string): SocialPlatformName | null {
  const upper = raw.toUpperCase();
  if (upper === "YOUTUBE" || upper === "TWITTER" || upper === "INSTAGRAM" || upper === "TIKTOK") {
    return upper;
  }
  // aliases
  if (upper === "X") return "TWITTER";
  if (upper === "YT") return "YOUTUBE";
  if (upper === "IG") return "INSTAGRAM";
  return null;
}

async function requireUser(request: Request) {
  const token = parseCookie(request.headers.get("cookie"), getCookieName());
  const user = await getUserFromSessionToken(token);
  return user;
}

async function ensureFreshTokens(
  platform: SocialPlatformName,
  account: {
    id: string;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string | null;
    tokenExpiresAt: Date | null;
  },
) {
  const provider = providers[platform];
  let accessToken = decrypt(account.accessTokenEncrypted);
  let refreshToken = account.refreshTokenEncrypted
    ? decrypt(account.refreshTokenEncrypted)
    : undefined;

  const expiresSoon =
    account.tokenExpiresAt &&
    account.tokenExpiresAt.getTime() < Date.now() + 60_000;

  if (expiresSoon && refreshToken && provider.refreshTokens) {
    const refreshed = await provider.refreshTokens(
      platform === "INSTAGRAM" ? accessToken : refreshToken,
    );
    accessToken = refreshed.accessToken;
    refreshToken = refreshed.refreshToken || refreshToken;
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessTokenEncrypted: encrypt(accessToken),
        refreshTokenEncrypted: refreshToken ? encrypt(refreshToken) : null,
        tokenExpiresAt: refreshed.expiresAt ?? null,
        scopes: refreshed.scopes ?? undefined,
      },
    });
  }

  return { accessToken, refreshToken };
}

export const socialRoutes = new Elysia({ prefix: "/socials" })
  .get("/:platform/start", async ({ params, request, set }) => {
    const platform = parsePlatform(params.platform);
    if (!platform) {
      set.status = 400;
      return { error: "Unknown platform" };
    }

    const user = await requireUser(request);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized — connect wallet first" };
    }

    const provider = providers[platform];
    try {
      requireConfigured(provider);
    } catch (err) {
      set.status = 503;
      return { error: err instanceof Error ? err.message : "Not configured" };
    }

    const state = randomBytes(24).toString("hex");
    const pkce = provider.createPkce?.();
    const redirectUri = callbackUrl(platform);

    await prisma.oAuthState.create({
      data: {
        state,
        platform: platform as SocialPlatform,
        userId: user.id,
        codeVerifier: pkce?.codeVerifier,
        expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
      },
    });

    const url = provider.getAuthorizeUrl({
      state,
      redirectUri,
      codeVerifier: pkce?.codeVerifier,
    });

    // Prefer redirect for browser navigation; also return JSON for fetch clients
    const accept = request.headers.get("accept") || "";
    if (accept.includes("text/html") || !accept.includes("application/json")) {
      set.redirect = url;
      return;
    }
    return { url };
  })
  .get("/:platform/callback", async ({ params, query, set }) => {
    const platform = parsePlatform(params.platform);
    const appOrigin = getCanonicalOrigin();
    const fail = (msg: string) => {
      set.redirect = `${appOrigin}/profile?error=${encodeURIComponent(msg)}`;
    };

    if (!platform) {
      fail("Unknown platform");
      return;
    }

    const code = typeof query.code === "string" ? query.code : undefined;
    const state = typeof query.state === "string" ? query.state : undefined;
    const oauthError =
      typeof query.error === "string"
        ? query.error
        : typeof query.error_description === "string"
          ? query.error_description
          : undefined;

    if (oauthError) {
      fail(oauthError);
      return;
    }
    if (!code || !state) {
      fail("Missing OAuth code or state");
      return;
    }

    const oauthState = await prisma.oAuthState.findUnique({ where: { state } });
    if (!oauthState || oauthState.expiresAt < new Date()) {
      if (oauthState) {
        await prisma.oAuthState.delete({ where: { id: oauthState.id } }).catch(() => {});
      }
      fail("Invalid or expired OAuth state");
      return;
    }

    if (oauthState.platform !== platform) {
      fail("OAuth platform mismatch");
      return;
    }

    await prisma.oAuthState.delete({ where: { id: oauthState.id } }).catch(() => {});

    const provider = providers[platform];
    try {
      requireConfigured(provider);
      const redirectUri = callbackUrl(platform);
      const tokens = await provider.exchangeCode({
        code,
        redirectUri,
        codeVerifier: oauthState.codeVerifier || undefined,
      });
      const profile = await provider.fetchProfile(tokens);

      await prisma.socialAccount.upsert({
        where: {
          userId_platform: {
            userId: oauthState.userId,
            platform: platform as SocialPlatform,
          },
        },
        create: {
          userId: oauthState.userId,
          platform: platform as SocialPlatform,
          platformUserId: profile.platformUserId,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          followerCount: profile.followerCount ?? null,
          followerCountSyncedAt: new Date(),
          accessTokenEncrypted: encrypt(tokens.accessToken),
          refreshTokenEncrypted: tokens.refreshToken
            ? encrypt(tokens.refreshToken)
            : platform === "INSTAGRAM"
              ? encrypt(tokens.accessToken)
              : null,
          tokenExpiresAt: tokens.expiresAt ?? null,
          scopes: tokens.scopes ?? null,
        },
        update: {
          platformUserId: profile.platformUserId,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          followerCount: profile.followerCount ?? null,
          followerCountSyncedAt: new Date(),
          accessTokenEncrypted: encrypt(tokens.accessToken),
          refreshTokenEncrypted: tokens.refreshToken
            ? encrypt(tokens.refreshToken)
            : platform === "INSTAGRAM"
              ? encrypt(tokens.accessToken)
              : undefined,
          tokenExpiresAt: tokens.expiresAt ?? null,
          scopes: tokens.scopes ?? null,
        },
      });

      set.redirect = `${appOrigin}/profile?linked=${platform.toLowerCase()}`;
    } catch (err) {
      fail(err instanceof Error ? err.message : "OAuth failed");
    }
  })
  .post("/:platform/refresh", async ({ params, request, set }) => {
    const platform = parsePlatform(params.platform);
    if (!platform) {
      set.status = 400;
      return { error: "Unknown platform" };
    }

    const user = await requireUser(request);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const account = await prisma.socialAccount.findUnique({
      where: {
        userId_platform: {
          userId: user.id,
          platform: platform as SocialPlatform,
        },
      },
    });
    if (!account) {
      set.status = 404;
      return { error: `${platform} is not linked` };
    }

    const provider = providers[platform];
    try {
      requireConfigured(provider);
      const { accessToken, refreshToken } = await ensureFreshTokens(platform, account);
      const profile = await provider.fetchProfile({
        accessToken,
        refreshToken,
      });

      const updated = await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          followerCount: profile.followerCount ?? null,
          followerCountSyncedAt: new Date(),
        },
      });

      return {
        ok: true,
        social: {
          platform: updated.platform,
          platformUserId: updated.platformUserId,
          username: updated.username,
          displayName: updated.displayName,
          avatarUrl: updated.avatarUrl,
          followerCount: updated.followerCount,
          followerCountSyncedAt: updated.followerCountSyncedAt,
        },
      };
    } catch (err) {
      set.status = 502;
      return { error: err instanceof Error ? err.message : "Refresh failed" };
    }
  })
  .delete("/:platform", async ({ params, request, set }) => {
    const platform = parsePlatform(params.platform);
    if (!platform) {
      set.status = 400;
      return { error: "Unknown platform" };
    }

    const user = await requireUser(request);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    await prisma.socialAccount.deleteMany({
      where: {
        userId: user.id,
        platform: platform as SocialPlatform,
      },
    });

    const fresh = await getUserFromSessionToken(
      parseCookie(request.headers.get("cookie"), getCookieName()),
    );
    return { ok: true, user: fresh ? publicUser(fresh) : null };
  });
