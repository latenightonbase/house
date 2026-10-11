"use client";

import { useState } from "react";
import { BadgeCheck, CalendarDays, Camera, Check, Copy } from "lucide-react";
import { Avatar } from "@/components/ui";
import { formatCount } from "@/lib/api";
import { shortAddress, walletFallbackAvatar } from "@/lib/utils";
import { formatDate, type ProfileHeader } from "@/lib/profileHistory";

const AVATAR_SIZE = 104;

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
 * The cover band. It is the person's own picture, blurred out to colour, so
 * each profile gets a header of its own without anyone having to upload one.
 * The violet wash underneath carries it when the image is slow or missing, and
 * the band fades out at the bottom (see .profile-cover) instead of ending on a
 * hard edge against the panel.
 */
function Cover({ image }: { image: string }) {
  return (
    <div aria-hidden="true" className="profile-cover relative h-24 overflow-hidden sm:h-32">
      <div
        className="absolute inset-0 scale-150 bg-cover bg-center opacity-45 blur-2xl"
        // Only these can end a quoted CSS url(); everything else is used as-is
        // so an already-encoded URL is not encoded twice.
        style={{
          backgroundImage: `url("${image.replace(/["\\\n]/g, encodeURIComponent)}")`,
        }}
      />
    </div>
  );
}

/**
 * The masthead of both profile pages: a cover band, the picture as a rounded
 * square sitting across its lower edge, and the name and chips beneath.
 *
 * `onEdit` makes the picture itself a way into editing — the obvious place to
 * click when the thing you want to change is the picture.
 */
export function ProfileHero({
  profile,
  action,
  onEdit,
}: {
  profile: ProfileHeader;
  action?: React.ReactNode;
  onEdit?: () => void;
}) {
  const socials = profile.socials.filter((social) => social.followerCount);
  // The display name is already "@username" when there is one, so printing the
  // handle underneath it would just say the same thing twice. It earns its line
  // only when the name came from somewhere else — a linked social, say.
  const handle =
    profile.username && profile.name !== `@${profile.username}` ? `@${profile.username}` : null;
  const seed = profile.wallet ?? profile.name;

  const avatar = (
    <Avatar
      src={profile.avatarUrl}
      alt={profile.name}
      fallbackSeed={seed}
      fallback={profile.name.slice(0, 2).toUpperCase()}
      size={AVATAR_SIZE}
      shape="square"
      className="bg-surface-2"
    />
  );

  return (
    <header className="panel-glow overflow-hidden">
      <Cover image={profile.avatarUrl || walletFallbackAvatar(seed)} />

      <div className="relative px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-12 flex items-end justify-between gap-3 sm:-mt-14">
          {/* The surface-coloured frame cuts the picture out of the cover. */}
          <div className="shrink-0 rounded-[26%] bg-surface p-1 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                aria-label="Change profile picture"
                className="group relative block rounded-[22%] outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {avatar}
                <span className="absolute inset-0 flex items-center justify-center rounded-[22%] bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera className="h-5 w-5 text-white" aria-hidden="true" />
                </span>
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-primary-light shadow-md lg:hidden">
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </button>
            ) : (
              avatar
            )}
          </div>

          {action && <div className="flex flex-wrap justify-end gap-2 pb-1">{action}</div>}
        </div>

        <div className="mt-4 min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {/* The name keeps its own case — a handle put through the display
                face's uppercase reads as a different handle. The bottom padding
                keeps descenders clear of truncate's clip at the face's tight
                line-height. */}
            <h1 className="display min-w-0 truncate pb-[0.12em] text-[clamp(1.5rem,3.8vw,2.25rem)] text-white">
              {profile.name}
            </h1>
            {profile.verified && (
              <BadgeCheck
                className="h-5 w-5 shrink-0 text-primary-bright"
                aria-label="Verified"
              />
            )}
          </div>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-caption">
            {handle && (
              <>
                <span className="text-white/80">{handle}</span>
                <span className="text-line-strong" aria-hidden="true">
                  ·
                </span>
              </>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Joined {formatDate(profile.createdAt)}
            </span>
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
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
      </div>
    </header>
  );
}

/** Keeps the page from jumping once the profile lands. */
export function ProfileHeroSkeleton() {
  return (
    <header className="panel-glow overflow-hidden" aria-busy="true">
      <div className="profile-cover relative h-24 sm:h-32" />
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-12 sm:-mt-14">
          <div className="inline-block rounded-[26%] bg-surface p-1">
            <div
              className="animate-pulse rounded-[22%] bg-white/[0.05]"
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-8 w-56 max-w-full animate-pulse rounded-md bg-white/[0.04]" />
          <div className="h-3.5 w-36 max-w-full animate-pulse rounded-md bg-white/[0.03]" />
          <div className="h-6 w-64 max-w-full animate-pulse rounded-full bg-white/[0.03]" />
        </div>
      </div>
    </header>
  );
}
