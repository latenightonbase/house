import { describe, expect, test } from "bun:test";
import { priceFromTick } from "./uniswapV3";

/**
 * The tick maths, pinned against readings taken from the live Robinhood pools.
 * Getting the decimal adjustment wrong is silent and catastrophic — a WETH/USDG
 * pool misreads by a factor of 1e12 — so both the same-decimals and
 * different-decimals cases are locked down here.
 */
describe("priceFromTick", () => {
  test("prices a same-decimals pair (LNOC/WETH, both 18)", () => {
    // Live LNOC/WETH pool tick, which quoted ~1.737e-7 WETH per LNOC.
    const price = priceFromTick(-155667, 18, 18);
    expect(price).toBeGreaterThan(1.73e-7);
    expect(price).toBeLessThan(1.74e-7);
  });

  test("applies the decimal difference (WETH/USDG, 18 vs 6)", () => {
    // Live WETH/USDG pool tick, which quoted ~$2687 per WETH.
    const price = priceFromTick(-197353, 18, 6);
    expect(price).toBeGreaterThan(2650);
    expect(price).toBeLessThan(2725);
  });

  test("without the decimal adjustment the same tick is 1e12 too small", () => {
    const adjusted = priceFromTick(-197353, 18, 6);
    const unadjusted = priceFromTick(-197353, 0, 0);
    expect(adjusted / unadjusted).toBeCloseTo(1e12, -6);
  });

  test("tick 0 is parity, shifted only by decimals", () => {
    expect(priceFromTick(0, 18, 18)).toBeCloseTo(1, 10);
    expect(priceFromTick(0, 18, 6)).toBeCloseTo(1e12, 0);
  });

  test("is monotonic — a higher tick is a higher price", () => {
    expect(priceFromTick(1000, 18, 18)).toBeGreaterThan(priceFromTick(999, 18, 18));
    expect(priceFromTick(-155000, 18, 18)).toBeGreaterThan(priceFromTick(-155667, 18, 18));
  });

  test("composes two legs into a USD price", () => {
    const wethPerLnoc = priceFromTick(-155667, 18, 18);
    const usdPerWeth = priceFromTick(-197353, 18, 6);
    const usd = wethPerLnoc * usdPerWeth;
    // Dexscreener independently quoted $0.0004671 at the same block height.
    expect(usd).toBeGreaterThan(0.00046);
    expect(usd).toBeLessThan(0.00047);
    expect(BigInt(Math.round(usd * 1e8))).toBeGreaterThan(46000n);
    expect(BigInt(Math.round(usd * 1e8))).toBeLessThan(47500n);
  });
});
