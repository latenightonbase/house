"use client";

import { useEffect, useState } from "react";
import type { Listing } from "@/lib/marketplace";
import {
  LNOC,
  listingToken,
  USDG,
  type PaymentToken,
} from "@/lib/contracts/auctionHouse";

/**
 * Indicative USD prices for the listing tokens — LNOC from DexScreener, USDG
 * from CoinGecko, both cached by the API. Display only: listings are priced and
 * paid in token units, so a stale or missing price never blocks a payment.
 */
export type TokenPrices = {
  USDG: number | null;
  LNOC: number | null;
  updatedAt: string | null;
};

const EMPTY: TokenPrices = { USDG: null, LNOC: null, updatedAt: null };
const REFRESH_MS = 60_000;

// One request and one timer shared by every component on the page, however
// many listing rows ask for a price.
let current: TokenPrices = EMPTY;
let lastFetched = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(prices: TokenPrices) => void>();

async function load() {
  if (inFlight) return inFlight;
  inFlight = fetch("/backend/token-prices", { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<TokenPrices>) : null))
    .then((next) => {
      lastFetched = Date.now();
      if (!next) return;
      current = next;
      listeners.forEach((listener) => listener(current));
    })
    .catch(() => {})
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

let timer: ReturnType<typeof setInterval> | null = null;

export function useTokenPrices(): TokenPrices {
  const [prices, setPrices] = useState<TokenPrices>(current);

  useEffect(() => {
    listeners.add(setPrices);
    if (Date.now() - lastFetched > REFRESH_MS) void load();
    else setPrices(current);
    timer ??= setInterval(() => {
      if (!document.hidden) void load();
    }, REFRESH_MS);

    return () => {
      listeners.delete(setPrices);
      if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);

  return prices;
}

/**
 * The shared price for USDG or LNOC. Matched by address, never symbol — a
 * token entered by address could call itself anything, and has its own price
 * from `useTokenLookup`.
 */
export function usdPrice(prices: TokenPrices, token: PaymentToken) {
  const address = token.address.toLowerCase();
  if (address === USDG.address.toLowerCase()) return prices.USDG ?? 1;
  if (address === LNOC.address.toLowerCase()) return prices.LNOC;
  return token.pegged ? 1 : null;
}

/** What `amount` of `token` is worth, or null while there is no price for it. */
export function usdValue(prices: TokenPrices, token: PaymentToken, amount: number) {
  const price = usdPrice(prices, token);
  return price == null || !Number.isFinite(amount) ? null : amount * price;
}

/** A Robinhood Chain ERC-20 as the API read it: identity, units and a USD price. */
export type TokenInfo = {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  /** One of the tokens offered by name. */
  known: boolean;
  /** From DexScreener; null when the token has no pool there. */
  priceUsd: number | null;
};

export type TokenLookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; token: TokenInfo }
  | { status: "error"; error: string };

const lookups = new Map<string, { at: number; result: Promise<TokenLookup> }>();

function lookupToken(address: string): Promise<TokenLookup> {
  const key = address.toLowerCase();
  const hit = lookups.get(key);
  if (hit && Date.now() - hit.at < REFRESH_MS) return hit.result;

  const result = fetch(`/backend/tokens/${address}`, { cache: "no-store" })
    .then(async (res): Promise<TokenLookup> => {
      const body = (await res.json().catch(() => null)) as
        | { token?: TokenInfo; error?: string }
        | null;
      if (res.ok && body?.token) return { status: "found", token: body.token };
      return { status: "error", error: body?.error ?? "Could not look up that token." };
    })
    .catch((): TokenLookup => ({ status: "error", error: "Could not look up that token." }));
  // A failed lookup is forgotten, so the next render can try again.
  void result.then((r) => {
    if (r.status === "error") lookups.delete(key);
  });
  lookups.set(key, { at: Date.now(), result });
  return result;
}

/**
 * Reads any token by address from the API — name, symbol, decimals and USD
 * price — refreshed every minute like the shared prices. Pass undefined to
 * stay idle.
 */
export function useTokenLookup(address: string | undefined): TokenLookup {
  const valid = Boolean(address && /^0x[a-fA-F0-9]{40}$/.test(address));
  const [state, setState] = useState<{ key: string; lookup: TokenLookup } | null>(null);

  useEffect(() => {
    if (!valid || !address) return;
    let live = true;
    const run = () =>
      lookupToken(address).then((lookup) => {
        if (live) setState({ key: address.toLowerCase(), lookup });
      });
    void run();
    const id = setInterval(() => {
      if (!document.hidden) void run();
    }, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [address, valid]);

  if (!valid || !address) return { status: "idle" };
  return state && state.key === address.toLowerCase() ? state.lookup : { status: "loading" };
}

/**
 * A dollar figure, with precision that follows its size — LNOC trades at a
 * fraction of a cent, so its unit price needs digits a $1,500 total does not.
 */
export function formatUsd(usd: number) {
  if (usd === 0) return "$0";
  if (usd < 0.01) {
    return `$${usd.toLocaleString(undefined, { maximumSignificantDigits: 3 })}`;
  }
  return `$${usd.toLocaleString(undefined, {
    minimumFractionDigits: usd < 1000 ? 2 : 0,
    maximumFractionDigits: usd < 1000 ? 2 : 0,
  })}`;
}

// Pinned to en-US: some locales abbreviate millions as a lowercase "m".
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

/**
 * A token amount with its symbol. Big LNOC figures go compact ("4.2M LNOC") so
 * they fit the same columns a dollar price does. Rows from before tokens were
 * chosen per listing carry "USD"/"USDC" and still read as dollars.
 */
export function formatTokenAmount(amount: number, symbol: string) {
  const digits = amount >= 100_000
    ? compact.format(amount)
    : amount.toLocaleString(undefined, { maximumFractionDigits: amount < 1 ? 4 : 2 });
  return symbol === "USD" || symbol === "USDC" ? `$${digits}` : `${digits} ${symbol}`;
}

/** The symbol a listing's amounts are in. */
export function listingSymbol(listing: Pick<Listing, "tokenName" | "currency">) {
  return listing.tokenName || listing.currency;
}

export function formatListingAmount(listing: Listing, amount: number) {
  return formatTokenAmount(amount, listingSymbol(listing));
}

/**
 * The "≈ $x" line under a token amount — only for a token that floats. USDG is
 * already dollars, and repeating the same number with a "$" adds nothing.
 */
export function useUsdHint(listing: Listing | null, amount: number): string | null {
  const prices = useTokenPrices();
  const token = listing ? listingToken(listing) : null;
  // A token entered by address is priced on its own; the house tokens share one request.
  const lookup = useTokenLookup(token?.custom ? token.address : undefined);
  if (!token || token.pegged) return null;
  const unit = token.custom
    ? lookup.status === "found"
      ? lookup.token.priceUsd
      : null
    : usdPrice(prices, token);
  if (unit == null || !Number.isFinite(amount)) return null;
  return `≈ ${formatUsd(amount * unit)}`;
}
