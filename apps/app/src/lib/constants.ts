/**
 * Single source for everything that is copy or configuration rather than
 * behaviour: the social accounts in the sidebar, the nav map, and the footer.
 * Swap a handle here and every surface follows.
 */

export const SITE = {
  name: "Late Night Onchain",
  shortName: "LNOC",
  tagline: "",
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
  { id: "x", label: "X", handle: "@latenightonchain", href: "https://x.com/lntvhq" },
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
  icon: "auction" | "market" | "vaults" | "call" | "how" | "winners" | "leaderboard" | "about";
  /** Hidden from the top bar when false — the sidebar still lists it. */
  inTopNav?: boolean;
  /** Off-site destination: opens in a new tab and is never marked active. */
  external?: boolean;
}

/** Where projects go to deploy a token — the Pantheon vault LNOC runs. */
export const PANTHEON_VAULTS_URL =
  "https://launch.pantheonvaults.com/vaults/0x076277c3d6b57b4aad34c592cd2f138e9316a991";

/** The plain paid call with Bill. Not in NAV_ITEMS — reached by direct link only. */
export const CALL_HREF = "/call";

/** The app's own home — the live auction and the market's front row. `/` is the landing page. */
export const APP_HOME_HREF = "/marketplace";

/** Every live listing, searchable. */
export const LISTINGS_HREF = "/listings";

export type CallPurpose = "call" | "appear" | "sponsor";

/**
 * The three ways into a paid call with Bill. Each runs the same pay-then-book
 * flow; only the copy differs, and the purpose rides along to Calendly so Bill
 * can tell a guest from a sponsor.
 */
export const CALL_PURPOSES: Record<
  CallPurpose,
  {
    href: string;
    eyebrow: string;
    title: string;
    titleAccent: string;
    intro: (minutes: number) => string;
    card: (minutes: number) => string;
    pitch: string;
  }
> = {
  call: {
    href: CALL_HREF,
    eyebrow: "1:1 with Bill",
    title: "Book a call",
    titleAccent: "with Bill",
    intro: (minutes) =>
      `A ${minutes}-minute call with Bill from the House. Pay in USDG or LNOC, then pick a time on his calendar.`,
    card: (minutes) => `${minutes}-min call with Bill`,
    pitch: "Thirty minutes one-on-one with Bill — your project, your pitch, your questions.",
  },
  appear: {
    href: "/appear",
    eyebrow: "Be a guest",
    title: "Appear on",
    titleAccent: "a show",
    intro: (minutes) =>
      `Come on ${SITE.name} as a guest. Pay in LNOC, then book a ${minutes}-minute call with Bill to plan your appearance.`,
    card: (minutes) => `${minutes}-min guest call`,
    pitch: "Thirty minutes with Bill to plan your spot on the show — who you are, what you're building, what you want to talk about.",
  },
  sponsor: {
    href: "/sponsor",
    eyebrow: "Sponsorships",
    title: "Sponsor",
    titleAccent: "a show",
    intro: (minutes) =>
      `Put your brand in front of the ${SITE.name} audience. Pay in LNOC, then book a ${minutes}-minute call with Bill to shape the sponsorship.`,
    card: (minutes) => `${minutes}-min sponsor call`,
    pitch: "Thirty minutes with Bill to plan your sponsorship — which shows, what the read says, where your brand lands.",
  },
};

export const NAV_ITEMS: NavItem[] = [
  { href: APP_HOME_HREF, label: "Live Auction", icon: "auction", inTopNav: true },
  { href: LISTINGS_HREF, label: "Media Marketplace", icon: "market", inTopNav: true },
  {
    href: PANTHEON_VAULTS_URL,
    label: "Pantheon Vaults",
    icon: "vaults",
    inTopNav: true,
    external: true,
  },
  { href: "/how-it-works", label: "How It Works", icon: "how", inTopNav: true },
  { href: "/past-winners", label: "Past Winners", icon: "winners", inTopNav: true },
  { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard", inTopNav: true },
  { href: "/about", label: "About LNOC", icon: "about", inTopNav: true },
];

export const FOOTER_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;

/** What the winning bidder receives — rendered as the strip under the auction. */
export const WINNER_BENEFITS = [
  { icon: "screen", label: "24-Hour Homepage Takeover" },
  { icon: "megaphone", label: "Social Promotion Across LNOC Channels" },
] as const;

/** The home page's opening pitch — what LNOC is, before any numbers. */
export const HOME_INTRO = {
  title: "The Onchain Marketplace for Goods and Services",
  /** The slice of the title drawn in the accent colour. */
  highlight: "Onchain Marketplace",
  pillars: [
    { icon: "buy", label: "Buy items", href: LISTINGS_HREF },
    { icon: "monetize", label: "Sell items", href: "/listings/new" },
  ],
} as const;

export const COPYRIGHT_YEAR = 2026;
