"use client";

import { useEffect, useState } from "react";
import type { Listing } from "@/lib/marketplace";
import { listingToken, type PaymentToken } from "@/lib/contracts/auctionHouse";

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

export function usdPrice(prices: TokenPrices, token: PaymentToken) {
  return prices[token.symbol] ?? (token.pegged ? 1 : null);
}

/** What `amount` of `token` is worth, or null while there is no price for it. */
export function usdValue(prices: TokenPrices, token: PaymentToken, amount: number) {
  const price = usdPrice(prices, token);
  return price == null || !Number.isFinite(amount) ? null : amount * price;
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
  if (!listing) return null;
  const token = listingToken(listing);
  if (token.pegged) return null;
  const usd = usdValue(prices, token, amount);
  return usd == null ? null : `≈ ${formatUsd(usd)}`;
}
