import { isOurS3Url } from "./s3/s3Client";

const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;
const AVATAR_DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,/;
const MAX_AVATAR_BYTES = 200 * 1024;

export function normalizeUsername(raw: string): string | null {
  const username = raw.trim().toLowerCase().replace(/^@/, "");
  if (!USERNAME_RE.test(username)) return null;
  return username;
}

export function parseAvatarDataUrl(raw: string | null | undefined): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;

  if (!AVATAR_DATA_URL_RE.test(raw)) return undefined;
  const comma = raw.indexOf(",");
  if (comma === -1) return undefined;
  const b64 = raw.slice(comma + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;
  if (bytes <= 0 || bytes > MAX_AVATAR_BYTES) return undefined;
  return raw;
}

/** Accepts a stored data-URL avatar or a public URL from our S3 bucket. */
export function parseAvatarUrl(raw: string | null | undefined): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;

  if (raw.startsWith("data:")) return parseAvatarDataUrl(raw);

  try {
    if (isOurS3Url(raw)) return raw.trim();
  } catch {
    return undefined;
  }
  return undefined;
}
