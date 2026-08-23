"use client";

import { useMemo, useState } from "react";
import { useSession } from "@/components/SessionProvider";
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
  platform,
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
    <div className="card p-4 space-y-4">
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
          <span className="badge badge-positive shrink-0">Verified</span>
        ) : (
          <span className="badge badge-neutral shrink-0">Not linked</span>
        )}
      </div>

      {linked ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {linked.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={linked.avatarUrl}
                alt=""
                className="h-11 w-11 rounded-full object-cover border border-line-strong"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-[12px] text-caption">
                {label[0]}
              </div>
            )}
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

          <div className="tile px-3.5 py-3">
            <p className="panel-label">{metric}</p>
            <p className="mt-1 numeric text-[22px] font-bold text-foreground">
              {formatCount(linked.followerCount)}
            </p>
            {linked.followerCountSyncedAt ? (
              <p className="mt-1 text-[11px] text-caption">
                Synced {new Date(linked.followerCountSyncedAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onRefresh}
              className="btn-accent-outline flex-1 h-9 text-[12px] disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onUnlink}
              className="h-9 rounded-lg border border-negative/40 bg-negative/10 px-3 text-[12px] font-semibold text-negative hover:bg-negative/15 disabled:opacity-50"
            >
              Unlink
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] text-caption leading-relaxed">
            Verify your {label} account to show your latest {metric}.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onVerify}
            className="btn-primary h-9 w-full text-[12px] disabled:opacity-50"
          >
            Verify {label}
          </button>
          <p className="text-[10px] text-caption/70">
            Requires {platform} OAuth credentials on the API.
          </p>
        </div>
      )}
    </div>
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
        <div className="tile border-dashed px-4 py-3 text-[12px] text-caption">
          SIWE session required. Social verify/refresh only syncs follower data —
          it is not authentication.
        </div>
      ) : null}
      {error ? (
        <div className="tile border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
          {error}
        </div>
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
