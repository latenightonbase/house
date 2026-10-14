/**
 * What the market indexers know about a Robinhood Chain token — its name,
 * symbol, logo and USD price from DexScreener, with CoinGecko filling the gaps
 * and supplying decimals, which DexScreener does not publish.
 *
 * Display data, apart from `decimals`: that one decides how a price becomes
 * token units, so it is only ever taken from CoinGecko's contract record (or,
 * failing that, from the token contract itself — see `resolveListingToken`).
 */

const TIMEOUT_MS = 8_000;
const TTL_MS = 60_000;
// Bounded so a stream of made-up addresses cannot grow the cache without limit.
const MAX_CACHED = 500;

/** CoinGecko's platform id and DexScreener's chain id for Robinhood Chain. */
const CHAIN = "robinhood";

/** Hosts a logo may come from — the same ones the app's image config allows. */
const LOGO_HOSTS = new Set([
  "cdn.dexscreener.com",
  "dd.dexscreener.com",
  "coin-images.coingecko.com",
  "assets.coingecko.com",
]);

export type MarketToken = {
  symbol: string | null;
  name: string | null;
  logoUrl: string | null;
  /** From CoinGecko only; null when it does not list the token. */
  decimals: number | null;
  priceUsd: number | null;
};

/** JSON from `url`, or null for a 404 — both indexers answer that for an unknown token. */
export async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function positive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function safeLogo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && LOGO_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

type DexPair = {
  chainId?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  info?: { imageUrl?: string };
};

/** The deepest Robinhood Chain pool that has `address` as its base token. */
export async function fromDexscreener(address: string): Promise<MarketToken | null> {
  const body = (await getJson(`https://api.dexscreener.com/latest/dex/tokens/${address}`)) as {
    pairs?: DexPair[] | null;
  } | null;

  const pairs = (body?.pairs ?? []).filter(
    (p) =>
      p.chainId === CHAIN &&
      p.baseToken?.address?.toLowerCase() === address.toLowerCase() &&
      positive(p.priceUsd) != null,
  );
  if (!pairs.length) return null;
  pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  const top = pairs[0];
  return {
    symbol: top.baseToken?.symbol || null,
    name: top.baseToken?.name || null,
    // Not every pool carries the token's profile, so take the first that does.
    logoUrl: pairs.map((p) => safeLogo(p.info?.imageUrl)).find(Boolean) ?? null,
    decimals: null,
    priceUsd: positive(top.priceUsd),
  };
}

type GeckoCoin = {
  symbol?: string;
  name?: string;
  image?: { large?: string; small?: string };
  detail_platforms?: Record<string, { decimal_place?: number | null } | undefined>;
  market_data?: { current_price?: { usd?: number } };
};

/** CoinGecko's record for the token contract, by address on Robinhood Chain. */
export async function fromCoingecko(address: string): Promise<MarketToken | null> {
  const coin = (await getJson(
    `https://api.coingecko.com/api/v3/coins/${CHAIN}/contract/${address.toLowerCase()}`,
  )) as GeckoCoin | null;
  if (!coin?.symbol) return null;
  const decimals = coin.detail_platforms?.[CHAIN]?.decimal_place;
  return {
    // CoinGecko lowercases symbols; tickers read as upper case everywhere else.
    symbol: coin.symbol.toUpperCase(),
    name: coin.name || null,
    logoUrl: safeLogo(coin.image?.large ?? coin.image?.small),
    decimals: Number.isInteger(decimals) ? (decimals as number) : null,
    priceUsd: positive(coin.market_data?.current_price?.usd),
  };
}

const cache = new Map<string, { at: number; token: MarketToken | null }>();
const inFlight = new Map<string, Promise<MarketToken | null>>();

async function lookup(address: string): Promise<MarketToken | null> {
  const [dex, gecko] = await Promise.allSettled([
    fromDexscreener(address),
    fromCoingecko(address),
  ]);
  if (dex.status === "rejected") console.warn(`[token-market] DexScreener ${address}:`, dex.reason);
  if (gecko.status === "rejected") console.warn(`[token-market] CoinGecko ${address}:`, gecko.reason);
  // Both down is not the same as both answering "never heard of it" — let the
  // caller retry rather than caching a blank.
  if (dex.status === "rejected" && gecko.status === "rejected") {
    throw new Error("Token indexers unreachable");
  }

  const d = dex.status === "fulfilled" ? dex.value : null;
  const g = gecko.status === "fulfilled" ? gecko.value : null;
  if (!d && !g) return null;
  return {
    symbol: d?.symbol ?? g?.symbol ?? null,
    name: d?.name ?? g?.name ?? null,
    logoUrl: d?.logoUrl ?? g?.logoUrl ?? null,
    decimals: g?.decimals ?? null,
    priceUsd: d?.priceUsd ?? g?.priceUsd ?? null,
  };
}

/**
 * DexScreener and CoinGecko merged — DexScreener first, as it lists far more of
 * Robinhood Chain's tokens. Null when neither knows the token; throws when
 * neither could be reached. Cached a minute per token, the same as prices.
 */
export async function getMarketToken(address: string): Promise<MarketToken | null> {
  const key = address.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.token;

  let pending = inFlight.get(key);
  if (!pending) {
    pending = lookup(address)
      .then((token) => {
        if (cache.size >= MAX_CACHED) cache.clear();
        cache.set(key, { at: Date.now(), token });
        return token;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}
