"use client";

import { useState } from "react";
import { BadgeCheck, Check, Copy } from "lucide-react";
import { Avatar } from "@/components/ui";
import { formatCount } from "@/lib/api";
import { shortAddress } from "@/lib/utils";
import { formatDate, type ProfileHeader } from "@/lib/profileHistory";

/** A wallet is only useful if it can leave the page — so it can be copied. */
function WalletChip({ wallet }: { wallet: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard is unavailable over plain http and in some embedded views.
      // The address is on screen either way, so there is nothing to recover.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Address copied" : `Copy ${wallet}`}
      className="tile inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] text-caption transition-colors hover:border-line-strong hover:text-white"
    >
      <span className="numeric">{shortAddress(wallet)}</span>
      {copied ? (
        <Check className="h-3 w-3 text-positive" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3" aria-hidden="true" />
      )}
    </button>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-caption">
      {children}
    </span>
  );
}

/**
 * The masthead of both profile pages. It replaces the old eyebrow-and-title
 * shell those pages used: the name was rendered twice, once as a page heading
 * and again inside the card under it, which read as two different things.
 */
export function ProfileHero({
  profile,
  action,
}: {
  profile: ProfileHeader;
  action?: React.ReactNode;
}) {
  const socials = profile.socials.filter((social) => social.followerCount);
  // The display name is already "@username" when there is one, so printing the
  // handle underneath it would just say the same thing twice. It earns its line
  // only when the name came from somewhere else — a linked social, say.
  const handle =
    profile.username && profile.name !== `@${profile.username}` ? `@${profile.username}` : null;

  return (
    <header className="panel-glow p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <Avatar
          src={profile.avatarUrl}
          alt={profile.name}
          fallbackSeed={profile.wallet ?? profile.name}
          fallback={profile.name.slice(0, 2).toUpperCase()}
          size={88}
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {/* The name keeps its own case — a handle put through the display
                face's uppercase reads as a different handle. */}
            <h1 className="display min-w-0 truncate text-[clamp(1.375rem,3.6vw,2rem)] text-white">
              {profile.name}
            </h1>
            {profile.verified && (
              <BadgeCheck
                className="h-5 w-5 shrink-0 text-primary-bright"
                aria-label="Verified"
              />
            )}
          </div>

          <p className="mt-1.5 text-[12px] text-caption">
            {handle ? `${handle} · ` : ""}
            Joined {formatDate(profile.createdAt)}
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {profile.wallet ? (
              <WalletChip wallet={profile.wallet} />
            ) : (
              <Chip>No wallet linked</Chip>
            )}
            {profile.reach > 0 && <Chip>{formatCount(profile.reach)} reach</Chip>}
            {socials.map((social) => (
              <Chip key={social.platform}>
                <span className="capitalize">{social.platform.toLowerCase()}</span>
                <span className="text-line-strong" aria-hidden="true">
                  ·
                </span>
                <span className="numeric text-white/80">
                  {formatCount(social.followerCount)}
                </span>
              </Chip>
            ))}
          </div>
        </div>

        {action && <div className="shrink-0 sm:pt-1">{action}</div>}
      </div>
    </header>
  );
}

/** Keeps the page from jumping once the profile lands. */
export function ProfileHeroSkeleton() {
  return (
    <header className="panel-glow p-5 sm:p-6" aria-busy="true">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="h-[88px] w-[88px] shrink-0 animate-pulse rounded-full bg-white/[0.04]" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-7 w-48 max-w-full animate-pulse rounded-md bg-white/[0.04]" />
          <div className="h-3.5 w-36 max-w-full animate-pulse rounded-md bg-white/[0.03]" />
          <div className="h-6 w-56 max-w-full animate-pulse rounded-full bg-white/[0.03]" />
        </div>
      </div>
    </header>
  );
}
