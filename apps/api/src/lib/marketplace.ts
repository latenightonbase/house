import type {
  Activation,
  Bid,
  Booking,
  Campaign,
  CreatorProfile,
  CreatorToken,
  Listing,
  SocialAccount,
  Vault,
  Wallet,
} from "@prisma/client";

const PLATFORM_MAP: Record<string, string> = {
  YOUTUBE: "youtube",
  TWITTER: "x",
  INSTAGRAM: "instagram",
  TIKTOK: "tiktok",
};

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function primaryWallet(user: { wallets: Wallet[] }) {
  return user.wallets.find((w) => w.isPrimary)?.address ?? user.wallets[0]?.address ?? "";
}

type ProfileUser = {
  avatarUrl: string | null;
  wallets: Wallet[];
  socials: SocialAccount[];
};

type ProfileWithUser = CreatorProfile & {
  user: ProfileUser;
};

/** Saved profile photo, then user upload, then first linked social. */
function resolvedAvatar(profile: { avatarUrl: string | null; user: ProfileUser }) {
  return (
    profile.avatarUrl ??
    profile.user.avatarUrl ??
    profile.user.socials.find((s) => s.avatarUrl)?.avatarUrl ??
    undefined
  );
}

function serializeHost(profile: ProfileWithUser) {
  return {
    id: profile.id,
    wallet: primaryWallet(profile.user),
    username: profile.username ?? undefined,
    displayName: profile.displayName,
    avatarUrl: resolvedAvatar(profile),
    verified: profile.verified,
    averageRating: profile.averageRating ?? undefined,
    totalReviews: profile.totalReviews ?? undefined,
  };
}

type AuctionWithRelations = {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  currency: string;
  minimumBid: number;
  imageUrl: string | null;
  tags: string[];
  avgViews: string | null;
  createdBy: "HUMAN" | "BOT";
  featured: boolean;
  bids: Bid[];
  host: ProfileWithUser;
};

export function serializeAuction(auction: AuctionWithRelations) {
  const topBid = auction.bids.reduce<Bid | null>(
    (max, b) => (!max || b.amount > max.amount ? b : max),
    null,
  );
  const reach = auction.host.user.socials
    .filter((s) => s.followerCount != null)
    .map((s) => ({ platform: PLATFORM_MAP[s.platform], value: compact(s.followerCount!) }));

  return {
    id: auction.id,
    title: auction.title,
    description: auction.description ?? undefined,
    startDate: auction.startDate.toISOString(),
    endDate: auction.endDate.toISOString(),
    currency: auction.currency,
    minimumBid: auction.minimumBid,
    hostedBy: serializeHost(auction.host),
    highestBid: topBid?.amount ?? 0,
    imageUrl: auction.imageUrl ?? resolvedAvatar(auction.host) ?? undefined,
    topBidder: topBid
      ? {
          wallet: topBid.bidderWallet,
          name: topBid.bidderName,
          avatarUrl: topBid.bidderAvatarUrl ?? undefined,
          amount: topBid.amount,
        }
      : null,
    participantCount: new Set(auction.bids.map((b) => b.bidderWallet)).size,
    hoursRemaining: Math.max(0, (auction.endDate.getTime() - Date.now()) / 3_600_000),
    bidCount: auction.bids.length,
    createdBy: auction.createdBy === "BOT" ? "bot" : "human",
    featured: auction.featured,
    reach,
    tags: auction.tags,
    avgViews: auction.avgViews ?? undefined,
    engagement:
      auction.host.engagementPct != null ? `${auction.host.engagementPct.toFixed(1)}%` : undefined,
    trend: auction.host.trend,
  };
}

type ProfileWithStats = ProfileWithUser & {
  auctions: { id: string }[];
  bookings: Booking[];
};

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export function serializeEarner(profile: ProfileWithStats) {
  const totalRevenue = profile.bookings.reduce((sum, b) => sum + b.amount, 0);
  const monthStart = startOfMonth();
  const bookingsThisMonth = profile.bookings.filter((b) => b.createdAt >= monthStart).length;
  const totalReach = profile.user.socials.reduce((sum, s) => sum + (s.followerCount ?? 0), 0);

  return {
    id: profile.id,
    wallet: primaryWallet(profile.user),
    totalRevenue,
    auctionCount: profile.auctions.length,
    bookingsThisMonth,
    username: profile.username ?? undefined,
    displayName: profile.displayName,
    avatarUrl: resolvedAvatar(profile),
    verified: profile.verified,
    reach: totalReach ? compact(totalReach) : undefined,
    engagement:
      profile.engagementPct != null ? `${profile.engagementPct.toFixed(1)}%` : undefined,
    inventory: profile.auctions.length,
    fromPrice: profile.fromPrice ?? undefined,
    platforms: profile.user.socials.map((s) => PLATFORM_MAP[s.platform]),
    tags: profile.tags,
    trend: profile.trend,
  };
}

export function serializeBooking(booking: Booking & { creator: CreatorProfile }) {
  return {
    id: booking.id,
    brand: booking.brand,
    markUrl: booking.markUrl ?? undefined,
    amount: booking.amount,
    placement: booking.placement,
    creator: booking.creator.displayName,
    status: booking.status,
  };
}

export function serializeCampaign(
  campaign: Campaign & { applications?: { id: string }[] },
) {
  return {
    id: campaign.id,
    name: campaign.name,
    brandName: campaign.brandName ?? undefined,
    budget: campaign.budget,
    lookingFor: campaign.lookingFor,
    brief: campaign.brief ?? undefined,
    platforms: campaign.platforms.map((p) => PLATFORM_MAP[p] ?? p.toLowerCase()),
    minReach: campaign.minReach ?? undefined,
    status: campaign.status,
    deadline: campaign.deadline?.toISOString(),
    applicantCount: campaign.applications?.length ?? 0,
    markUrl: campaign.markUrl ?? undefined,
  };
}

type ListingWithCreator = Listing & {
  creator: CreatorProfile & { user: ProfileUser };
};

export function serializeListing(listing: ListingWithCreator) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description ?? undefined,
    category: listing.category,
    pricingType: listing.pricingType,
    placement: listing.placement ?? undefined,
    platform: listing.platform ? PLATFORM_MAP[listing.platform] : undefined,
    price: listing.price,
    currency: listing.currency,
    turnaroundDays: listing.turnaroundDays ?? undefined,
    slotsAvailable: listing.slotsAvailable,
    endDate: listing.endDate?.toISOString(),
    status: listing.status,
    chainId: listing.chainId ?? undefined,
    contractAddress: listing.contractAddress ?? undefined,
    tokenAddress: listing.tokenAddress ?? undefined,
    tokenName: listing.tokenName ?? undefined,
    txHash: listing.txHash ?? undefined,
    isDaily: listing.isDaily,
    winnerWallet: listing.winnerWallet ?? undefined,
    settledAt: listing.settledAt?.toISOString(),
    creator: {
      id: listing.creator.id,
      wallet: primaryWallet(listing.creator.user),
      displayName: listing.creator.displayName,
      username: listing.creator.username ?? undefined,
      avatarUrl: resolvedAvatar(listing.creator),
      verified: listing.creator.verified,
      reach: compact(
        listing.creator.user.socials.reduce((sum, s) => sum + (s.followerCount ?? 0), 0),
      ),
    },
  };
}

export function serializeActivation(activation: Activation & { vault: Vault | null }) {
  return {
    id: activation.id,
    name: activation.name,
    description: activation.description ?? undefined,
    brandName: activation.brandName,
    brandMarkUrl: activation.brandMarkUrl ?? undefined,
    status: activation.status,
    participantCount: activation.participantCount,
    startDate: activation.startDate.toISOString(),
    endDate: activation.endDate?.toISOString(),
    vault: activation.vault
      ? {
          id: activation.vault.id,
          name: activation.vault.name,
          totalRewards: activation.vault.totalRewards,
          distributed: activation.vault.distributed,
          currency: activation.vault.currency,
        }
      : null,
  };
}

type TokenWithCreator = CreatorToken & {
  creator: CreatorProfile & { user: ProfileUser };
};

export function serializeCreatorToken(token: TokenWithCreator) {
  return {
    id: token.id,
    symbol: token.symbol,
    name: token.name,
    holders: token.holders,
    supply: token.supply,
    revenueSharePct: token.revenueSharePct ?? undefined,
    creator: {
      id: token.creator.id,
      wallet: primaryWallet(token.creator.user),
      displayName: token.creator.displayName,
      username: token.creator.username ?? undefined,
      avatarUrl: resolvedAvatar(token.creator),
      verified: token.creator.verified,
      reach: compact(
        token.creator.user.socials.reduce((sum, s) => sum + (s.followerCount ?? 0), 0),
      ),
    },
  };
}
