import { publicClient } from "../operator";

/**
 * Minimal Uniswap v3 pool reads, enough to price a token without trusting a
 * third-party API.
 *
 * Two ways to read a price, and the difference is the whole point:
 *
 * - `observe()` gives a time-weighted average tick. Moving a TWAP means holding
 *   a manipulated price across the whole window, which costs real money and is
 *   what makes it safe to price against.
 * - `slot0()` gives the instantaneous tick. A single swap moves it, so in a thin
 *   pool it is cheap to manipulate. Only acceptable behind the sanity bounds the
 *   keeper applies.
 *
 * A pool can only serve a TWAP if its observation buffer has been grown past the
 * default of 1, which is permissionless but has to have happened, and if enough
 * time has elapsed since. `observe()` reverts with `OLD` otherwise.
 */

export const uniswapV3PoolAbi = [
  {
    type: "function",
    name: "slot0",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "observe",
    stateMutability: "view",
    inputs: [{ name: "secondsAgos", type: "uint32[]" }],
    outputs: [
      { name: "tickCumulatives", type: "int56[]" },
      { name: "secondsPerLiquidityCumulativeX128s", type: "uint160[]" },
    ],
  },
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "liquidity", stateMutability: "view", inputs: [], outputs: [{ type: "uint128" }] },
  {
    type: "function",
    name: "increaseObservationCardinalityNext",
    stateMutability: "nonpayable",
    inputs: [{ name: "observationCardinalityNext", type: "uint16" }],
    outputs: [],
  },
] as const;

export const erc20DecimalsAbi = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

export type PriceSource = "twap" | "spot";

export type PoolPrice = {
  /** How many token1 one whole token0 buys, with decimals applied. */
  price: number;
  tick: number;
  source: PriceSource;
  /** Seconds the TWAP covered; 0 for a spot read. */
  windowSeconds: number;
  /** The pool's observation buffer size. 1 means a TWAP is impossible. */
  observationCardinality: number;
};

/**
 * Converts a tick to a human price of token0 denominated in token1.
 *
 * A tick is `1.0001^tick` in *raw* units, so the decimal difference has to be
 * applied on top — without it a WETH/USDG pool reads 1e12 times off.
 */
export function priceFromTick(tick: number, decimals0: number, decimals1: number): number {
  return Math.pow(1.0001, tick) * Math.pow(10, decimals0 - decimals1);
}

const decimalsCache = new Map<string, number>();

export async function tokenDecimals(address: `0x${string}`): Promise<number> {
  const key = address.toLowerCase();
  const cached = decimalsCache.get(key);
  if (cached !== undefined) return cached;

  const decimals = await publicClient().readContract({
    address,
    abi: erc20DecimalsAbi,
    functionName: "decimals",
  });
  decimalsCache.set(key, Number(decimals));
  return Number(decimals);
}

export type PoolMeta = {
  token0: `0x${string}`;
  token1: `0x${string}`;
  decimals0: number;
  decimals1: number;
  observationCardinality: number;
};

export async function readPoolMeta(pool: `0x${string}`): Promise<PoolMeta> {
  const client = publicClient();
  const [token0, token1, slot0] = await Promise.all([
    client.readContract({ address: pool, abi: uniswapV3PoolAbi, functionName: "token0" }),
    client.readContract({ address: pool, abi: uniswapV3PoolAbi, functionName: "token1" }),
    client.readContract({ address: pool, abi: uniswapV3PoolAbi, functionName: "slot0" }),
  ]);

  const [decimals0, decimals1] = await Promise.all([
    tokenDecimals(token0 as `0x${string}`),
    tokenDecimals(token1 as `0x${string}`),
  ]);

  return {
    token0: token0 as `0x${string}`,
    token1: token1 as `0x${string}`,
    decimals0,
    decimals1,
    observationCardinality: Number(slot0[3]),
  };
}

/**
 * Arithmetic-mean tick across `secondsAgo`, or null when the pool cannot
 * honestly provide one.
 *
 * The cardinality check is the load-bearing part. A pool whose observation
 * buffer is still 1 does NOT revert once its single observation is older than
 * the window — Uniswap extrapolates from it using the *current* tick, so
 * `observe` happily returns an "average" that is exactly the spot price. That
 * is indistinguishable from a real TWAP in the return value and completely
 * manipulable by one swap, so it has to be rejected here rather than trusted.
 */
export async function twapTick(
  pool: `0x${string}`,
  secondsAgo: number,
  observationCardinality: number,
): Promise<number | null> {
  if (observationCardinality <= 1) return null;

  try {
    const [tickCumulatives] = await publicClient().readContract({
      address: pool,
      abi: uniswapV3PoolAbi,
      functionName: "observe",
      args: [[0, secondsAgo]],
    });
    const delta = tickCumulatives[0] - tickCumulatives[1];
    // Truncates toward zero exactly as the Uniswap periphery does.
    return Number(delta / BigInt(secondsAgo));
  } catch {
    // `OLD` — the window reaches back past the oldest stored observation.
    return null;
  }
}

export async function spotTick(pool: `0x${string}`): Promise<number> {
  const slot0 = await publicClient().readContract({
    address: pool,
    abi: uniswapV3PoolAbi,
    functionName: "slot0",
  });
  return Number(slot0[1]);
}

/**
 * Price of token0 in token1, preferring a genuine TWAP and falling back to spot.
 * The result names which was used so a caller can hold a spot reading to tighter
 * bounds — or refuse it outright.
 *
 * Cardinality is re-read on every call rather than cached: growing a pool's
 * buffer is permissionless, so a pool that cannot serve a TWAP today may be able
 * to tomorrow, and this should start trusting it without a redeploy.
 */
export async function readPoolPrice(
  pool: `0x${string}`,
  meta: PoolMeta,
  windowSeconds: number,
): Promise<PoolPrice> {
  const slot0 = await publicClient().readContract({
    address: pool,
    abi: uniswapV3PoolAbi,
    functionName: "slot0",
  });
  const spot = Number(slot0[1]);
  const cardinality = Number(slot0[3]);

  const averaged = await twapTick(pool, windowSeconds, cardinality);
  if (averaged !== null) {
    return {
      price: priceFromTick(averaged, meta.decimals0, meta.decimals1),
      tick: averaged,
      source: "twap",
      windowSeconds,
      observationCardinality: cardinality,
    };
  }

  return {
    price: priceFromTick(spot, meta.decimals0, meta.decimals1),
    tick: spot,
    source: "spot",
    windowSeconds: 0,
    observationCardinality: cardinality,
  };
}
