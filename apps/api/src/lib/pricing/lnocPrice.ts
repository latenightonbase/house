import { readPoolMeta, readPoolPrice, type PoolMeta, type PriceSource } from "./uniswapV3";

/**
 * LNOC in dollars, read from the chain rather than a price API.
 *
 * There is no LNOC/stable pool, so the price is two hops: LNOC→WETH from the
 * house pool, then WETH→USDG from the deepest stable pool on the chain. Only
 * the first hop is thin; the WETH/USDG pool holds millions and carries a full
 * observation buffer, so that leg is a genuine TWAP.
 *
 * The LNOC/WETH pool ships with an observation buffer of 1, which means no TWAP
 * until someone calls `increaseObservationCardinalityNext` and enough swaps have
 * landed since. Until then this falls back to spot and says so, and the keeper
 * treats a spot-derived price with far more suspicion.
 */

const DEFAULT_LNOC = "0x076277c3d6b57B4aad34c592cd2f138e9316a991";
const DEFAULT_LNOC_WETH_POOL = "0x8A22a8A5ea033c0b57d1Ec39C135624cfCB9b8C5";
/** Deepest WETH/USDG pool on Robinhood chain (~$19M), 0.01% fee. */
const DEFAULT_WETH_USDG_POOL = "0x52e65B17fB6E5BA00Ed806f37Afcd2DaA50271Ca";
const DEFAULT_TWAP_SECONDS = 1800;

function envAddress(name: string, fallback: string): `0x${string}` {
  const raw = process.env[name]?.trim();
  return (raw && /^0x[a-fA-F0-9]{40}$/.test(raw) ? raw : fallback) as `0x${string}`;
}

export function lnocTokenAddress() {
  return envAddress("LNOC_TOKEN_ADDRESS", DEFAULT_LNOC);
}

export function lnocWethPool() {
  return envAddress("LNOC_WETH_POOL", DEFAULT_LNOC_WETH_POOL);
}

export function wethUsdgPool() {
  return envAddress("WETH_USDG_POOL", DEFAULT_WETH_USDG_POOL);
}

export function twapWindowSeconds() {
  const parsed = Number(process.env.LNOC_TWAP_SECONDS);
  return Number.isFinite(parsed) && parsed >= 60 ? Math.floor(parsed) : DEFAULT_TWAP_SECONDS;
}

export type LnocPriceReading = {
  /** Dollars per whole LNOC. */
  usd: number;
  /** `usd` in the contract's 8-decimal fixed point, ready for setTokenUsdPrice. */
  usdPriceE8: bigint;
  /** WETH bought by one LNOC — the thin, manipulable leg. */
  wethPerLnoc: number;
  /** Dollars per WETH, from the deep stable pool. */
  wethUsd: number;
  /** The weaker of the two legs: "spot" means at least one hop was not averaged. */
  source: PriceSource;
  legs: {
    lnocWeth: { source: PriceSource; tick: number; windowSeconds: number; observationCardinality: number };
    wethUsdg: { source: PriceSource; tick: number; windowSeconds: number; observationCardinality: number };
  };
};

let cachedMeta: { lnocWeth: PoolMeta; wethUsdg: PoolMeta } | null = null;

async function poolMeta() {
  if (cachedMeta) return cachedMeta;
  const [lnocWeth, wethUsdg] = await Promise.all([
    readPoolMeta(lnocWethPool()),
    readPoolMeta(wethUsdgPool()),
  ]);
  cachedMeta = { lnocWeth, wethUsdg };
  return cachedMeta;
}

/**
 * Re-reads a pool price as "quote per one `base`". `readPoolPrice` always returns
 * token0 priced in token1, and Uniswap orders token0/token1 by address, so which
 * way round a pool sits is an accident of addresses and must never be assumed.
 */
function perOne(price: number, meta: PoolMeta, base: `0x${string}`): number {
  return meta.token0.toLowerCase() === base.toLowerCase() ? price : 1 / price;
}

export async function readLnocUsdPrice(): Promise<LnocPriceReading> {
  const meta = await poolMeta();
  const window = twapWindowSeconds();
  const lnoc = lnocTokenAddress();

  // Whichever side of the LNOC pool is not LNOC is the WETH we price in dollars.
  const weth =
    meta.lnocWeth.token0.toLowerCase() === lnoc.toLowerCase()
      ? meta.lnocWeth.token1
      : meta.lnocWeth.token0;

  const [lnocLeg, wethLeg] = await Promise.all([
    readPoolPrice(lnocWethPool(), meta.lnocWeth, window),
    readPoolPrice(wethUsdgPool(), meta.wethUsdg, window),
  ]);

  const wethPerLnoc = perOne(lnocLeg.price, meta.lnocWeth, lnoc);
  const wethUsd = perOne(wethLeg.price, meta.wethUsdg, weth);
  const usd = wethPerLnoc * wethUsd;

  return {
    usd,
    usdPriceE8: BigInt(Math.round(usd * 1e8)),
    wethPerLnoc,
    wethUsd,
    source: lnocLeg.source === "twap" && wethLeg.source === "twap" ? "twap" : "spot",
    legs: {
      lnocWeth: {
        source: lnocLeg.source,
        tick: lnocLeg.tick,
        windowSeconds: lnocLeg.windowSeconds,
        observationCardinality: lnocLeg.observationCardinality,
      },
      wethUsdg: {
        source: wethLeg.source,
        tick: wethLeg.tick,
        windowSeconds: wethLeg.windowSeconds,
        observationCardinality: wethLeg.observationCardinality,
      },
    },
  };
}
