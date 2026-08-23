import type { ReactElement } from "react";
import { Youtube, Mic, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export type { Platform } from "@/utils/types";
import type { Platform } from "@/utils/types";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.7a5.67 5.67 0 0 0-.77-.05A5.66 5.66 0 1 0 15.54 15.3V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48z" />
    </svg>
  );
}

const ICONS: Record<Platform, (p: { className?: string }) => ReactElement> = {
  x: XIcon,
  youtube: ({ className }) => <Youtube className={className} />,
  tiktok: TikTokIcon,
  podcast: ({ className }) => <Mic className={className} />,
  newsletter: ({ className }) => <Mail className={className} />,
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  x: "X",
  youtube: "YouTube",
  tiktok: "TikTok",
  podcast: "Podcast",
  newsletter: "Newsletter",
};

/** A single platform glyph. Use when composing your own label/value pairing. */
export function PlatformIcon({
  platform,
  className = "w-4 h-4",
}: {
  platform: Platform;
  className?: string;
}) {
  const Icon = ICONS[platform];
  return (
    <span title={PLATFORM_LABELS[platform]} className="shrink-0 inline-flex">
      <Icon className={className} />
      <span className="sr-only">{PLATFORM_LABELS[platform]}</span>
    </span>
  );
}

/**
 * Row of platform glyphs showing where a creator distributes. Used in the
 * trending table's Platforms column.
 */
export default function PlatformIcons({
  platforms,
  className,
  size = "w-3.5 h-3.5",
}: {
  platforms: Platform[];
  className?: string;
  size?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 text-caption", className)}>
      {platforms.map((platform) => {
        const Icon = ICONS[platform];
        return (
          <span key={platform} title={PLATFORM_LABELS[platform]} className="shrink-0">
            <Icon className={size} />
            <span className="sr-only">{PLATFORM_LABELS[platform]}</span>
          </span>
        );
      })}
    </div>
  );
}
