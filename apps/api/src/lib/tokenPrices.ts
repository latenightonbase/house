import { LNOC } from "./tokens";

/**
 * Indicative USD prices for the listing tokens — what the app shows next to a
 * token amount so a seller pricing in LNOC can see what that is worth. Nothing
 * on-chain depends on these: listings are priced and paid in token units.
 *
 * LNOC comes from DexScreener (its only market is a Uniswap pool on Robinhood
 * Chain, which CoinGecko does not list); USDG from CoinGecko's `global-dollar`.
 * Both are cached so a page full of listings costs one upstream call a minute.
 */

export type TokenPrices = {
  USDG: number | null;
  LNOC: number | null;
  updatedAt: string | null;
};

const TTL_MS = 60_000;
const TIMEOUT_MS = 8_000;

let cached: TokenPrices = { USDG: null, LNOC: null, updatedAt: null };
let fetchedAt = 0;
let inFlight: Promise<TokenPrices> | null = null;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

type DexPair = {
  chainId?: string;
  baseToken?: { address?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
};

/** The deepest Robinhood Chain pool that quotes LNOC as its base token. */
async function lnocFromDexscreener(): Promise<number | null> {
  const body = (await getJson(
    `https://api.dexscreener.com/latest/dex/tokens/${LNOC.address}`,
  )) as { pairs?: DexPair[] | null };

  const pairs = (body.pairs ?? []).filter(
    (p) =>
      p.chainId === "robinhood" &&
      p.baseToken?.address?.toLowerCase() === LNOC.address.toLowerCase() &&
      Number(p.priceUsd) > 0,
  );
  pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  const price = Number(pairs[0]?.priceUsd);
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function usdgFromCoingecko(): Promise<number | null> {
  const body = (await getJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=global-dollar&vs_currencies=usd",
  )) as { "global-dollar"?: { usd?: number } };
  const price = Number(body["global-dollar"]?.usd);
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function refresh(): Promise<TokenPrices> {
  const [lnoc, usdg] = await Promise.allSettled([lnocFromDexscreener(), usdgFromCoingecko()]);
  if (lnoc.status === "rejected") console.warn("[token-prices] LNOC:", lnoc.reason);
  if (usdg.status === "rejected") console.warn("[token-prices] USDG:", usdg.reason);

  // A failed source keeps its last good value rather than blanking the UI.
  // USDG is a dollar stable, so with no reading at all it still reads as $1.
  const next: TokenPrices = {
    LNOC: (lnoc.status === "fulfilled" ? lnoc.value : null) ?? cached.LNOC,
    USDG: (usdg.status === "fulfilled" ? usdg.value : null) ?? cached.USDG ?? 1,
    updatedAt: new Date().toISOString(),
  };
  cached = next;
  fetchedAt = Date.now();
  return next;
}

export async function getTokenPrices(): Promise<TokenPrices> {
  if (Date.now() - fetchedAt < TTL_MS) return cached;
  inFlight ??= refresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
