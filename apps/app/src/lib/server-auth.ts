import { cookies } from "next/headers";

const COOKIE_NAME = process.env.COOKIE_NAME || "house_session";
const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:3001";

/** Server-side SIWE session check against the identity API. */
export async function getServerSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_ORIGIN}/auth/me`, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: unknown };
    return data.user;
  } catch {
    return null;
  }
}
