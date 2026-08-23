import { Elysia, t } from "elysia";
import type { Hex } from "viem";
import { issueNonce, verifyAndUpsertUser } from "../lib/siwe";
import {
  createSession,
  getCookieName,
  getUserFromSessionToken,
  parseCookie,
  publicUser,
  revokeSession,
} from "../lib/session";

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
  });
