/**
 * Single source for everything that is copy or configuration rather than
 * behaviour: the social accounts in the sidebar, the nav map, and the footer.
 * Swap a handle here and every surface follows.
 */

export const SITE = {
  name: "Late Night Onchain",
  shortName: "LNOC",
  tagline: "The marketplace for attention",
  /** Footer strapline, under the wordmark. */
  strapline: "The world's first market for internet attention.",
  keywords: "Auctions. Attention. Exposure.",
} as const;

export type SocialId = "x" | "youtube" | "telegram" | "instagram";

export interface SocialLink {
  id: SocialId;
  label: string;
  /** Shown on hover and to screen readers. */
  handle: string;
  href: string;
}

/** Bottom-left of the sidebar. Order here is the order rendered. */
export const SOCIAL_LINKS: SocialLink[] = [
  { id: "x", label: "X", handle: "@latenightonchain", href: "https://x.com/latenightonchain" },
  // {
  //   id: "youtube",
  //   label: "YouTube",
  //   handle: "Late Night Onchain",
  //   href: "https://youtube.com/@latenightonchain",
  // },
  {
    id: "telegram",
    label: "Telegram",
    handle: "Late Night Onchain",
    href: "https://t.me/latenightonchain",
  },
  // {
  //   id: "instagram",
  //   label: "Instagram",
  //   handle: "@latenightonchain",
  //   href: "https://instagram.com/latenightonchain",
  // },
];

export interface NavItem {
  href: string;
  label: string;
  /** Icon key resolved in `components/nav/navIcons.tsx`. */
  icon: "auction" | "how" | "winners" | "economy" | "leaderboard" | "about";
  /** Hidden from the top bar when false — the sidebar still lists it. */
  inTopNav?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Live Auction", icon: "auction", inTopNav: true },
  { href: "/how-it-works", label: "How It Works", icon: "how", inTopNav: true },
  { href: "/past-winners", label: "Past Winners", icon: "winners", inTopNav: true },
  { href: "/attention-economy", label: "Attention Economy", icon: "economy", inTopNav: true },
  { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard", inTopNav: true },
  { href: "/about", label: "About LNOC", icon: "about", inTopNav: true },
];

export const FOOTER_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;

/** What the winning bidder receives — rendered as the strip under the auction. */
export const WINNER_BENEFITS = [
  { icon: "mic", label: "30-Minute Appearance on Late Night" },
  { icon: "screen", label: "24-Hour Homepage Takeover" },
  { icon: "megaphone", label: "Social Promotion Across LNOC Channels" },
  { icon: "clips", label: "2–3 Short-Form Clips From Appearance" },
] as const;

export const COPYRIGHT_YEAR = 2026;
