import {
  BarChart3,
  Crown,
  Info,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/lib/constants";

/** The circled "LN" monogram that sits beside About — not a Lucide glyph. */
function AboutMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="12"
        y="15.4"
        textAnchor="middle"
        fill="currentColor"
        fontSize="8"
        fontWeight="700"
        letterSpacing="0.3"
        fontFamily="inherit"
      >
        LN
      </text>
    </svg>
  );
}

const ICONS: Record<NavItem["icon"], LucideIcon | typeof AboutMark> = {
  auction: Zap,
  how: Info,
  winners: Trophy,
  economy: BarChart3,
  leaderboard: Crown,
  about: AboutMark,
};

export function NavIcon({
  name,
  className,
}: {
  name: NavItem["icon"];
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden="true" />;
}
