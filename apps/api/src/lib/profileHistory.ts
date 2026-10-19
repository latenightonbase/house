import { prisma } from "../db";
import { auctionDealKey, purchaseDealKey } from "./reviews";
import { fillRatings, type Rating } from "./ratings";

/**
 * Profile history: what a user sold and who won it, and what they bought or won
 * from other people. Both profile pages read the same builders — the public
 * page renders exactly what the private one does minus the contact affordance,
 * so the two can never drift apart.
 *
 * A sale has two shapes. A FIXED listing sells a slot at a time and each sale is
 * a `Purchase` row, so one listing can have several buyers. An AUCTION settles
 * once to a single `winnerWallet`. Both collapse into the same `counterparties`
 * array here, which is what lets one component render the whole history.
 */

const identityInclude = {
  socials: { orderBy: { platform: "asc" } },
  wallets: { orderBy: { createdAt: "asc" } },
} as const;

type IdentityUser = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  socials: Array<{ displayName: string | null; username: string | null; avatarUrl: string | null }>;
  wallets: Array<{ address: string; isPrimary: boolean }>;
};

export type PartyIdentity = {
  /** Null when the wallet has never signed in — there is then nobody to chat to. */
  userId: string | null;
  wallet: string | null;
  name: string;
  username: string | null;
  /**
   * What `/user/:handle` resolves them by — their username, else their account
   * id. Null for a wallet that never signed in, which has no profile to visit.
   * Not `username`, which can fall back to a social handle the route can't find.
   */
  handle: string | null;
  avatarUrl: string | null;
  /** Their overall review rating; null until someone has reviewed them. */
  rating: Rating | null;
};

export type SaleCounterparty = PartyIdentity & {
  /** Names this sale for a review — see `lib/reviews.ts`. */
  dealKey: string;
  /** What they actually paid — the winning bid, or the fixed price at purchase. */
  amount: number;
  currency: string;
  txHash: string | null;
  at: string;
};

export type SaleRecord = {
  listingId: string;
  title: string;
  posterUrl: string | null;
  category: string;
  pricingType: "FIXED" | "AUCTION";
  status: string;
  price: number;
  currency: string;
  endDate: string | null;
  settledAt: string | null;
  createdAt: string;
  /** Sum of every counterparty amount — the listing's realised revenue. */
  totalEarned: number;
  counterparties: SaleCounterparty[];
};

export type PurchaseRecord = {
  listingId: string;
  title: string;
  posterUrl: string | null;
  category: string;
  pricingType: "FIXED" | "AUCTION";
  /** How it was acquired, which is what the UI labels it with. */
  via: "PURCHASE" | "AUCTION_WIN";
  /** Names this sale for a review — see `lib/reviews.ts`. */
  dealKey: string;
  amount: number;
  currency: string;
  txHash: string | null;
  at: string;
  seller: PartyIdentity;
};

export function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

/** Username first, then a linked social, then the wallet — never an empty name. */
export function toIdentity(
  user: IdentityUser | null | undefined,
  fallbackWallet?: string | null,
): PartyIdentity {
  const social = user?.socials.find((s) => s.displayName || s.username || s.avatarUrl);
  const wallet =
    fallbackWallet?.toLowerCase() ??
    (user?.wallets.find((w) => w.isPrimary) ?? user?.wallets[0])?.address.toLowerCase() ??
    null;

  return {
    userId: user?.id ?? null,
    wallet,
    name:
      (user?.username ? `@${user.username}` : null) ||
      social?.displayName ||
      (social?.username ? `@${social.username}` : null) ||
      (wallet ? shortWallet(wallet) : "Unknown"),
    username: user?.username ?? social?.username ?? null,
    handle: user ? (user.username ?? user.id) : null,
    avatarUrl: user?.avatarUrl ?? social?.avatarUrl ?? null,
    // Filled per page by `fillRatings`, so a list is one query, not one each.
    rating: null,
  };
}

/** One lookup for a batch of wallets, so a history page is not N+1 queries. */
async function identitiesByWallet(wallets: string[]): Promise<Map<string, PartyIdentity>> {
  const unique = [...new Set(wallets.map((w) => w.toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { wallets: { some: { address: { in: unique } } } },
    include: identityInclude,
  });

  const map = new Map<string, PartyIdentity>();
  for (const user of users) {
    for (const wallet of user.wallets) {
      const address = wallet.address.toLowerCase();
      if (unique.includes(address)) map.set(address, toIdentity(user, address));
    }
  }
  // A winner who never linked an account still shows, just without a chat link.
  for (const wallet of unique) {
    if (!map.has(wallet)) map.set(wallet, toIdentity(null, wallet));
  }
  return map;
}

/**
 * Everything a user has sold: settled auctions and purchased fixed-price
 * listings. Ordered newest first by when the money actually changed hands.
 */
export async function getSalesHistory(userId: string): Promise<SaleRecord[]> {
  const listings = await prisma.listing.findMany({
    where: {
      creator: { userId },
      isDaily: false,
      OR: [{ status: "SOLD" }, { settledAt: { not: null } }, { purchases: { some: {} } }],
    },
    orderBy: [{ settledAt: "desc" }, { createdAt: "desc" }],
    include: {
      bids: { orderBy: { amount: "desc" }, take: 1 },
      purchases: {
        orderBy: { createdAt: "desc" },
        include: { buyer: { include: identityInclude } },
      },
    },
  });

  const winnerWallets = listings
    .filter((l) => l.pricingType === "AUCTION" && l.winnerWallet)
    .map((l) => l.winnerWallet!);
  const winners = await identitiesByWallet(winnerWallets);

  const sales = listings
    .map((listing) => {
      const counterparties: SaleCounterparty[] = [];

      if (listing.pricingType === "AUCTION" && listing.winnerWallet) {
        const identity = winners.get(listing.winnerWallet.toLowerCase());
        counterparties.push({
          ...(identity ?? toIdentity(null, listing.winnerWallet)),
          dealKey: auctionDealKey(listing.id),
          amount: listing.bids[0]?.amount ?? listing.price,
          currency: listing.currency,
          txHash: listing.bids[0]?.txHash ?? null,
          at: (listing.settledAt ?? listing.updatedAt).toISOString(),
        });
      }

      for (const purchase of listing.purchases) {
        counterparties.push({
          ...toIdentity(purchase.buyer, purchase.buyerWallet),
          dealKey: purchaseDealKey(purchase.id),
          amount: purchase.amount,
          currency: purchase.currency,
          txHash: purchase.txHash,
          at: purchase.createdAt.toISOString(),
        });
      }

      return {
        listingId: listing.id,
        title: listing.title,
        posterUrl: listing.posterUrl,
        category: listing.category,
        pricingType: listing.pricingType,
        status: listing.status,
        price: listing.price,
        currency: listing.currency,
        endDate: listing.endDate?.toISOString() ?? null,
        settledAt: listing.settledAt?.toISOString() ?? null,
        createdAt: listing.createdAt.toISOString(),
        totalEarned: counterparties.reduce((sum, c) => sum + c.amount, 0),
        counterparties,
      };
    })
    .filter((sale) => sale.counterparties.length > 0);

  await fillRatings(sales.flatMap((sale) => sale.counterparties));
  return sales;
}

/**
 * Everything a user acquired from someone else: fixed-price purchases plus
 * auctions their wallets won. Auction wins are matched by wallet because that
 * is what settlement records, so a win still lands here if the account linked
 * that wallet after the fact.
 */
export async function getPurchaseHistory(userId: string): Promise<PurchaseRecord[]> {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    select: { address: true },
  });
  const addresses = wallets.map((w) => w.address.toLowerCase());

  const sellerInclude = {
    creator: { include: { user: { include: identityInclude } } },
  } as const;

  const [purchases, wins] = await Promise.all([
    prisma.purchase.findMany({
      where: { buyerUserId: userId, listing: { isDaily: false } },
      orderBy: { createdAt: "desc" },
      include: { listing: { include: sellerInclude } },
    }),
    addresses.length
      ? prisma.listing.findMany({
          where: {
            pricingType: "AUCTION",
            isDaily: false,
            winnerWallet: { in: addresses },
            settledAt: { not: null },
          },
          orderBy: { settledAt: "desc" },
          include: { ...sellerInclude, bids: { orderBy: { amount: "desc" }, take: 1 } },
        })
      : Promise.resolve([]),
  ]);

  const fromPurchases: PurchaseRecord[] = purchases.map((purchase) => ({
    listingId: purchase.listingId,
    title: purchase.listing.title,
    posterUrl: purchase.listing.posterUrl,
    category: purchase.listing.category,
    pricingType: purchase.listing.pricingType,
    via: "PURCHASE",
    dealKey: purchaseDealKey(purchase.id),
    amount: purchase.amount,
    currency: purchase.currency,
    txHash: purchase.txHash,
    at: purchase.createdAt.toISOString(),
    seller: toIdentity(purchase.listing.creator.user),
  }));

  const fromWins: PurchaseRecord[] = wins.map((listing) => ({
    listingId: listing.id,
    title: listing.title,
    posterUrl: listing.posterUrl,
    category: listing.category,
    pricingType: listing.pricingType,
    via: "AUCTION_WIN",
    dealKey: auctionDealKey(listing.id),
    amount: listing.bids[0]?.amount ?? listing.price,
    currency: listing.currency,
    txHash: listing.bids[0]?.txHash ?? null,
    at: (listing.settledAt ?? listing.updatedAt).toISOString(),
    seller: toIdentity(listing.creator.user),
  }));

  const all = [...fromPurchases, ...fromWins].sort((a, b) => b.at.localeCompare(a.at));
  await fillRatings(all.map((purchase) => purchase.seller));
  return all;
}

/** The public identity header both profile pages open with. */
export async function getProfileHeader(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { ...identityInclude, creatorProfile: true },
  });
  if (!user) return null;

  const identity = toIdentity(user);
  return {
    id: user.id,
    name: identity.name,
    username: identity.username,
    avatarUrl: identity.avatarUrl ?? user.creatorProfile?.avatarUrl ?? null,
    wallet: identity.wallet,
    createdAt: user.createdAt.toISOString(),
    verified: user.creatorProfile?.verified ?? false,
    reach: user.socials.reduce((sum, s) => sum + (s.followerCount ?? 0), 0),
    socials: user.socials.map((s) => ({
      platform: s.platform,
      username: s.username,
      displayName: s.displayName,
      followerCount: s.followerCount,
    })),
  };
}

/** Resolves `/user/:handle` against an id first, then a username. */
export async function resolveUserId(handle: string): Promise<string | null> {
  const byId = await prisma.user.findUnique({ where: { id: handle }, select: { id: true } });
  if (byId) return byId.id;

  const username = handle.trim().toLowerCase().replace(/^@/, "");
  const byUsername = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return byUsername?.id ?? null;
}

export type RecentSale = {
  listingId: string;
  title: string;
  posterUrl: string | null;
  pricingType: "FIXED" | "AUCTION";
  via: "PURCHASE" | "AUCTION_WIN";
  amount: number;
  currency: string;
  /** The listing's token symbol when it was priced in one; `currency` otherwise. */
  tokenName: string | null;
  at: string;
  seller: Omit<PartyIdentity, "userId">;
  buyer: Omit<PartyIdentity, "userId">;
};

/** Public feed, so the chat handle comes off — the visible identity stays. */
function publicParty({ userId: _userId, ...rest }: PartyIdentity) {
  return rest;
}

/**
 * The home page's "recently sold" feed: fixed-price purchases and settled
 * auctions with a winner, merged and newest first. A multi-slot listing sells
 * once per slot, so it can appear more than once — each row is a sale, not a
 * listing. Auctions that closed with no bids settle to CANCELLED without a
 * winner and are left out.
 */
export async function getRecentSales(limit: number): Promise<RecentSale[]> {
  const sellerInclude = {
    creator: { include: { user: { include: identityInclude } } },
  } as const;

  const [purchases, wins] = await Promise.all([
    prisma.purchase.findMany({
      where: { listing: { isDaily: false } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        buyer: { include: identityInclude },
        listing: { include: sellerInclude },
      },
    }),
    prisma.listing.findMany({
      where: {
        pricingType: "AUCTION",
        isDaily: false,
        settledAt: { not: null },
        winnerWallet: { not: null },
      },
      orderBy: { settledAt: "desc" },
      take: limit,
      include: { ...sellerInclude, bids: { orderBy: { amount: "desc" }, take: 1 } },
    }),
  ]);

  const winners = await identitiesByWallet(wins.map((l) => l.winnerWallet!));

  const seller = (creator: (typeof wins)[number]["creator"]) => {
    const identity = toIdentity(creator.user);
    return { ...identity, avatarUrl: identity.avatarUrl ?? creator.avatarUrl };
  };

  // Built with chat handles on so ratings can be looked up by account, then
  // stripped below before anything leaves.
  type Draft = Omit<RecentSale, "seller" | "buyer"> & { seller: PartyIdentity; buyer: PartyIdentity };

  const fromPurchases: Draft[] = purchases.map((purchase) => ({
    listingId: purchase.listingId,
    title: purchase.listing.title,
    posterUrl: purchase.listing.posterUrl,
    pricingType: purchase.listing.pricingType,
    via: "PURCHASE",
    amount: purchase.amount,
    currency: purchase.currency,
    tokenName: purchase.listing.tokenName,
    at: purchase.createdAt.toISOString(),
    seller: seller(purchase.listing.creator),
    buyer: toIdentity(purchase.buyer, purchase.buyerWallet),
  }));

  const fromWins: Draft[] = wins.map((listing) => ({
    listingId: listing.id,
    title: listing.title,
    posterUrl: listing.posterUrl,
    pricingType: listing.pricingType,
    via: "AUCTION_WIN",
    amount: listing.bids[0]?.amount ?? listing.price,
    currency: listing.currency,
    tokenName: listing.tokenName,
    at: (listing.settledAt ?? listing.updatedAt).toISOString(),
    seller: seller(listing.creator),
    buyer: winners.get(listing.winnerWallet!.toLowerCase()) ?? toIdentity(null, listing.winnerWallet),
  }));

  const recent = [...fromPurchases, ...fromWins]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
  await fillRatings(recent.flatMap((sale) => [sale.seller, sale.buyer]));
  return recent.map((sale) => ({
    ...sale,
    seller: publicParty(sale.seller),
    buyer: publicParty(sale.buyer),
  }));
}

export type ListingDeal = {
  dealKey: string;
  /** The viewer's side of this deal. */
  side: "BUYER" | "SELLER";
  /** The other party — carries `userId`, since this is the viewer's own deal. */
  counterparty: PartyIdentity;
  amount: number;
  currency: string;
  at: string;
};

/**
 * The signed-in user's own deals on one listing — what they bought or won
 * from it, or, if it is theirs, who bought or won it. The listing page uses
 * this to put "Rate" and "Message" right where the sale happened, without
 * loading the user's whole history.
 */
export async function getListingDeals(userId: string, listingId: string): Promise<ListingDeal[]> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      creator: { include: { user: { include: identityInclude } } },
      purchases: { orderBy: { createdAt: "desc" }, include: { buyer: { include: identityInclude } } },
      bids: { orderBy: { amount: "desc" }, take: 1 },
    },
  });
  if (!listing || listing.isDaily) return [];

  const isSeller = listing.creator.userId === userId;
  const deals: ListingDeal[] = [];

  for (const purchase of listing.purchases) {
    if (!isSeller && purchase.buyerUserId !== userId) continue;
    deals.push({
      dealKey: purchaseDealKey(purchase.id),
      side: isSeller ? "SELLER" : "BUYER",
      counterparty: isSeller
        ? toIdentity(purchase.buyer, purchase.buyerWallet)
        : toIdentity(listing.creator.user),
      amount: purchase.amount,
      currency: purchase.currency,
      at: purchase.createdAt.toISOString(),
    });
  }

  if (listing.pricingType === "AUCTION" && listing.settledAt && listing.winnerWallet) {
    const winner = listing.winnerWallet.toLowerCase();
    const viewerWon = isSeller
      ? false
      : Boolean(
          await prisma.wallet.findFirst({ where: { userId, address: winner }, select: { id: true } }),
        );
    if (isSeller || viewerWon) {
      deals.push({
        dealKey: auctionDealKey(listing.id),
        side: isSeller ? "SELLER" : "BUYER",
        counterparty: isSeller
          ? ((await identitiesByWallet([winner])).get(winner) ?? toIdentity(null, winner))
          : toIdentity(listing.creator.user),
        amount: listing.bids[0]?.amount ?? listing.price,
        currency: listing.currency,
        at: listing.settledAt.toISOString(),
      });
    }
  }

  await fillRatings(deals.map((deal) => deal.counterparty));
  return deals;
}
