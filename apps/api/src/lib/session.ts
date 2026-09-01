import { randomBytes } from "crypto";
import { prisma } from "../db";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const COOKIE_NAME = process.env.COOKIE_NAME || "house_session";

export function getCookieName() {
  return COOKIE_NAME;
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { token, userId, expiresAt },
  });
  return { token, expiresAt };
}

export async function revokeSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function getUserFromSessionToken(token: string | undefined) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          wallets: { orderBy: { createdAt: "asc" } },
          socials: { orderBy: { platform: "asc" } },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  return session.user;
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
  };
}

export function parseCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    if (key === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return undefined;
}

/** Session user for a request, or null when the cookie is missing/expired. */
export async function getUserFromRequest(request: Request) {
  return getUserFromSessionToken(parseCookie(request.headers.get("cookie"), COOKIE_NAME));
}

export function publicUser(user: NonNullable<Awaited<ReturnType<typeof getUserFromSessionToken>>>) {
  return {
    id: user.id,
    createdAt: user.createdAt,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role ?? "USER",
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    wallets: user.wallets.map((w) => ({
      address: w.address,
      chainId: w.chainId,
      isPrimary: w.isPrimary,
      verifiedAt: w.verifiedAt,
    })),
    socials: user.socials.map((s) => ({
      platform: s.platform,
      platformUserId: s.platformUserId,
      username: s.username,
      displayName: s.displayName,
      avatarUrl: s.avatarUrl,
      followerCount: s.followerCount,
      followerCountSyncedAt: s.followerCountSyncedAt,
    })),
  };
}
