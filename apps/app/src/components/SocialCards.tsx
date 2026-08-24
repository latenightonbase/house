"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { Avatar, Button, Card, Tile } from "@/components/ui";
import {
  formatCount,
  refreshSocial,
  unlinkSocial,
  type PublicSocial,
  type SocialPlatform,
} from "@/lib/api";

const PLATFORMS: Array<{
  id: SocialPlatform;
  label: string;
  metric: string;
  color: string;
}> = [
  { id: "YOUTUBE", label: "YouTube", metric: "subscribers", color: "#FF0033" },
  { id: "TWITTER", label: "X (Twitter)", metric: "followers", color: "#E7E9EA" },
  { id: "INSTAGRAM", label: "Instagram", metric: "followers", color: "#E1306C" },
  { id: "TIKTOK", label: "TikTok", metric: "followers", color: "#69C9D0" },
];

function SocialCard({
  label,
  metric,
  color,
  linked,
  busy,
  onVerify,
  onRefresh,
  onUnlink,
}: {
  platform: SocialPlatform;
  label: string;
  metric: string;
  color: string;
  linked?: PublicSocial;
  busy: boolean;
  onVerify: () => void;
  onRefresh: () => void;
  onUnlink: () => void;
}) {
  return (
    <Card className="p-4 flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="text-[13px] font-semibold text-foreground truncate">
            {label}
          </h3>
        </div>
        {linked ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-positive shrink-0">
            <Check className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : (
          <span className="text-[11px] text-caption shrink-0">Not linked</span>
        )}
      </div>

      {linked ? (
        <>
          <div className="flex items-center gap-3">
            <Avatar
              src={linked.avatarUrl}
              alt={linked.displayName || linked.username || label}
              fallback={label[0]}
              size={40}
              className="text-[12px]"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">
                {linked.displayName || linked.username || linked.platformUserId}
              </p>
              {linked.username ? (
                <p className="text-[12px] text-primary-light truncate">
                  @{linked.username}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <p className="numeric text-2xl font-bold text-foreground">
              {formatCount(linked.followerCount)}
            </p>
            <p className="text-[11px] text-caption mt-0.5">
              {metric}
              {linked.followerCountSyncedAt
                ? ` · synced ${new Date(linked.followerCountSyncedAt).toLocaleDateString()}`
                : ""}
            </p>
          </div>

          <div className="mt-auto flex gap-2">
            <Button
              variant="accent-outline"
              disabled={busy}
              onClick={onRefresh}
              className="h-9 flex-1"
            >
              Refresh
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={onUnlink}
              className="h-9 rounded-lg border border-line-strong px-3 text-[12px] font-medium text-caption hover:text-negative hover:border-negative/40 transition-colors disabled:opacity-50"
            >
              Unlink
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12px] text-caption leading-relaxed">
            Verify {label} to show your {metric}.
          </p>
          <Button disabled={busy} onClick={onVerify} className="mt-auto h-9 w-full">
            Verify {label}
          </Button>
        </>
      )}
    </Card>
  );
}

export function SocialCards() {
  const { status, user, refresh } = useSession();
  const [busy, setBusy] = useState<SocialPlatform | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byPlatform = useMemo(() => {
    const map = new Map<SocialPlatform, PublicSocial>();
    user?.socials.forEach((s) => map.set(s.platform, s));
    return map;
  }, [user]);

  if (status === "loading") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-40 animate-pulse bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  const authenticated = status === "authenticated" && !!user;

  const onVerify = (platform: SocialPlatform) => {
    if (!authenticated) return;
    window.location.href = `/backend/socials/${platform.toLowerCase()}/start`;
  };

  const onRefresh = async (platform: SocialPlatform) => {
    setBusy(platform);
    setError(null);
    try {
      await refreshSocial(platform);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setBusy(null);
    }
  };

  const onUnlink = async (platform: SocialPlatform) => {
    setBusy(platform);
    setError(null);
    try {
      await unlinkSocial(platform);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlink failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {!authenticated ? (
        <Tile className="border-dashed px-4 py-3 text-[12px] text-caption">
          Connect your wallet to link socials — they sync follower data, not sign-in.
        </Tile>
      ) : null}
      {error ? (
        <Tile className="border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
          {error}
        </Tile>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORMS.map((p) => (
          <SocialCard
            key={p.id}
            platform={p.id}
            label={p.label}
            metric={p.metric}
            color={p.color}
            linked={byPlatform.get(p.id)}
            busy={busy === p.id || !authenticated}
            onVerify={() => onVerify(p.id)}
            onRefresh={() => void onRefresh(p.id)}
            onUnlink={() => void onUnlink(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
