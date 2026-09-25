/**
 * Profile history — what someone sold and who won it, and what they bought or
 * won from other people.
 *
 * The public and private endpoints return the same records with one deliberate
 * difference: only the private one carries a counterparty `userId`. That id is
 * what the contact button needs, so the type marks it optional and the UI shows
 * the button only where it is present. A visitor therefore cannot open a chat
 * with a stranger from someone else's profile page.
 */

export type PricingType = "FIXED" | "AUCTION";

export type PartyIdentity = {
  /** Present on the private view only. Absent means "not contactable here". */
  userId?: string | null;
  wallet: string | null;
  name: string;
  username: string | null;
  avatarUrl: string | null;
};

export type SaleCounterparty = PartyIdentity & {
  amount: number;
  currency: string;
  txHash: string | null;
  at: string;
};

export type SaleRecord = {
  listingId: string;
  title: string;
  category: string;
  pricingType: PricingType;
  status: string;
  isDaily: boolean;
  price: number;
  currency: string;
  endDate: string | null;
  settledAt: string | null;
  createdAt: string;
  totalEarned: number;
  counterparties: SaleCounterparty[];
};

export type PurchaseRecord = {
  listingId: string;
  title: string;
  category: string;
  pricingType: PricingType;
  isDaily: boolean;
  via: "PURCHASE" | "AUCTION_WIN";
  amount: number;
  currency: string;
  txHash: string | null;
  at: string;
  seller: PartyIdentity;
};

export type ProfileHeader = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  wallet: string | null;
  createdAt: string;
  verified: boolean;
  reach: number;
  socials: Array<{
    platform: string;
    username: string | null;
    displayName: string | null;
    followerCount: number | null;
  }>;
};

export type ProfileOverview = {
  profile: ProfileHeader | null;
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
};

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", cache: "no-store", ...init });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/** The signed-in user's own history. Counterparties here are contactable. */
export function fetchMyProfileOverview(): Promise<ProfileOverview> {
  return getJson<ProfileOverview>("/backend/profile/overview");
}

/** Anyone's public history, by user id or username. Not contactable. */
export async function fetchUserProfile(handle: string): Promise<ProfileOverview | null> {
  const res = await fetch(`/backend/users/${encodeURIComponent(handle)}/profile`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load profile");
  return (await res.json()) as ProfileOverview;
}

export function formatAmount(amount: number, currency = "USDC") {
  const formatted =
    amount >= 1000
      ? amount.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${formatted} ${currency}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** How a sale reads in a list: "Auction" vs "Direct sale", plus the daily tag. */
export function saleKindLabel(sale: SaleRecord) {
  if (sale.isDaily) return "Daily auction";
  return sale.pricingType === "AUCTION" ? "Auction" : "Direct sale";
}
