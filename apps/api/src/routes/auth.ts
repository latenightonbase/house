import { Elysia, t } from "elysia";
import { Prisma } from "@prisma/client";
import type { Hex } from "viem";
import { prisma } from "../db";
import { issueNonce, verifyAndUpsertUser } from "../lib/siwe";
import {
  createSession,
  getCookieName,
  getUserFromRequest,
  getUserFromSessionToken,
  parseCookie,
  publicUser,
  revokeSession,
} from "../lib/session";
import { normalizeUsername, parseAvatarDataUrl } from "../lib/profile";
import { requestEmailOtp, verifyEmailOtp } from "../lib/otp";
import { sendWelcome } from "../lib/email";

async function maybeSendWelcome(userId: string, wasIncomplete: boolean) {
  if (!wasIncomplete) return;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.email && user.emailVerifiedAt && user.username) {
    await sendWelcome(user.email, user.username).catch((err) => {
      console.error("[email] welcome failed:", err);
    });
  }
}

function serializeCookie(
  name: string,
  value: string,
  opts: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    expires?: Date;
  },
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join("; ");
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .get("/nonce", async () => {
    const nonce = await issueNonce();
    return { nonce };
  })
  .post(
    "/verify",
    async ({ body, set }) => {
      try {
        const user = await verifyAndUpsertUser(body.message, body.signature as Hex);
        const { token, expiresAt } = await createSession(user.id);
        const name = getCookieName();
        set.headers["Set-Cookie"] = serializeCookie(name, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          expires: expiresAt,
        });

        const full = await getUserFromSessionToken(token);
        return { ok: true, user: full ? publicUser(full) : null };
      } catch (err) {
        set.status = 401;
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Verification failed",
        };
      }
    },
    {
      body: t.Object({
        message: t.String(),
        signature: t.String(),
      }),
    },
  )
  .post("/logout", async ({ request, set }) => {
    const token = parseCookie(request.headers.get("cookie"), getCookieName());
    if (token) await revokeSession(token);
    set.headers["Set-Cookie"] = serializeCookie(getCookieName(), "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
    return { ok: true };
  })
  .get("/me", async ({ request, set }) => {
    const token = parseCookie(request.headers.get("cookie"), getCookieName());
    const user = await getUserFromSessionToken(token);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return { user: publicUser(user) };
  })
  .patch(
    "/profile",
    async ({ request, body, set }) => {
      const sessionUser = await getUserFromRequest(request);
      if (!sessionUser) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const username = normalizeUsername(body.username);
      if (!username) {
        set.status = 400;
        return {
          error:
            "Username must be 3–20 characters, start with a letter, and use only letters, numbers, or underscores.",
        };
      }

      const avatarUrl = parseAvatarDataUrl(body.avatarUrl);
      if (body.avatarUrl !== undefined && body.avatarUrl !== null && avatarUrl === undefined) {
        set.status = 400;
        return { error: "Profile picture must be a JPEG, PNG, or WebP under 200KB." };
      }

      const wasIncomplete = !sessionUser.username || !sessionUser.emailVerifiedAt;

      try {
        const updated = await prisma.user.update({
          where: { id: sessionUser.id },
          data: {
            username,
            ...(body.avatarUrl !== undefined ? { avatarUrl: avatarUrl ?? null } : {}),
          },
          include: {
            wallets: { orderBy: { createdAt: "asc" } },
            socials: { orderBy: { platform: "asc" } },
          },
        });
        await prisma.creatorProfile.updateMany({
          where: { userId: sessionUser.id },
          data: {
            username,
            displayName: username,
            ...(body.avatarUrl !== undefined ? { avatarUrl: avatarUrl ?? null } : {}),
          },
        });
        await maybeSendWelcome(sessionUser.id, wasIncomplete);
        return { user: publicUser(updated) };
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          set.status = 409;
          return { error: "That username is taken." };
        }
        set.status = 500;
        return {
          error: err instanceof Error ? err.message : "Failed to save profile",
        };
      }
    },
    {
      body: t.Object({
        username: t.String(),
        avatarUrl: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    },
  )
  .post(
    "/email/request-otp",
    async ({ request, body, set }) => {
      const sessionUser = await getUserFromRequest(request);
      if (!sessionUser) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      try {
        const { email } = await requestEmailOtp(sessionUser.id, body.email);
        return { ok: true, email };
      } catch (err) {
        set.status = 400;
        return { error: err instanceof Error ? err.message : "Could not send code." };
      }
    },
    {
      body: t.Object({
        email: t.String(),
      }),
    },
  )
  .post(
    "/email/verify-otp",
    async ({ request, body, set }) => {
      const sessionUser = await getUserFromRequest(request);
      if (!sessionUser) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const wasIncomplete = !sessionUser.username || !sessionUser.emailVerifiedAt;
      try {
        await verifyEmailOtp(sessionUser.id, body.email, body.code);
        await maybeSendWelcome(sessionUser.id, wasIncomplete);
        const full = await prisma.user.findUnique({
          where: { id: sessionUser.id },
          include: {
            wallets: { orderBy: { createdAt: "asc" } },
            socials: { orderBy: { platform: "asc" } },
          },
        });
        return { ok: true, user: full ? publicUser(full) : null };
      } catch (err) {
        set.status = 400;
        return { error: err instanceof Error ? err.message : "Could not verify code." };
      }
    },
    {
      body: t.Object({
        email: t.String(),
        code: t.String(),
      }),
    },
  );
