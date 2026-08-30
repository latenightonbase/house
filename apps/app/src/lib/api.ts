export type SocialPlatform = "YOUTUBE" | "TWITTER" | "INSTAGRAM" | "TIKTOK";

export type PublicSocial = {
  platform: SocialPlatform;
  platformUserId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  followerCount?: number | null;
  followerCountSyncedAt?: string | null;
};

export type PublicUser = {
  id: string;
  createdAt: string;
  username?: string | null;
  avatarUrl?: string | null;
  wallets: Array<{
    address: string;
    chainId: number;
    isPrimary: boolean;
    verifiedAt: string;
  }>;
  socials: PublicSocial[];
};

export async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch("/backend/auth/me", {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to load session");
  const data = (await res.json()) as { user: PublicUser };
  return data.user;
}

export async function refreshSocial(platform: SocialPlatform) {
  const res = await fetch(`/backend/socials/${platform.toLowerCase()}/refresh`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Refresh failed");
  return data.social as PublicSocial;
}

export async function updateProfile(input: {
  username: string;
  avatarUrl?: string | null;
}): Promise<PublicUser> {
  const res = await fetch("/backend/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const text = await res.text();
  let data: { error?: string; user?: PublicUser } = {};
  try {
    data = text ? (JSON.parse(text) as { error?: string; user?: PublicUser }) : {};
  } catch {
    throw new Error(text.trim().slice(0, 160) || "Failed to save profile");
  }
  if (!res.ok) throw new Error(data.error || "Failed to save profile");
  if (!data.user) throw new Error("Failed to save profile");
  return data.user;
}

export async function unlinkSocial(platform: SocialPlatform) {
  const res = await fetch(`/backend/socials/${platform.toLowerCase()}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Unlink failed");
  return data.user as PublicUser | null;
}

export function formatCount(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
