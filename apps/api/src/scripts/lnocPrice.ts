/**
 * Inspects the LNOC price the keeper would publish, without publishing it.
 *
 * Pass --run to actually perform a keeper pass (still subject to every guard,
 * but it will write on-chain if the price passes them).
 *
 *   bun run price:lnoc          # read-only
 *   bun run price:lnoc -- --run # perform a guarded publish
 */
import { readLnocUsdPrice } from "../lib/pricing/lnocPrice";
import { keeperConfig, runLnocPriceKeeper } from "../lib/pricing/keeper";

const reading = await readLnocUsdPrice();

console.log("LNOC price");
console.log(`  USD            $${reading.usd.toFixed(8)}`);
console.log(`  usdPriceE8     ${reading.usdPriceE8}`);
console.log(`  WETH per LNOC  ${reading.wethPerLnoc.toExponential(6)}`);
console.log(`  WETH in USD    $${reading.wethUsd.toFixed(2)}`);
console.log(`  source         ${reading.source}`);
console.log(
  `    LNOC/WETH    ${reading.legs.lnocWeth.source} (cardinality ${reading.legs.lnocWeth.observationCardinality}, window ${reading.legs.lnocWeth.windowSeconds}s)`,
);
console.log(
  `    WETH/USDG    ${reading.legs.wethUsdg.source} (cardinality ${reading.legs.wethUsdg.observationCardinality}, window ${reading.legs.wethUsdg.windowSeconds}s)`,
);

if (reading.source === "spot") {
  console.log(
    "\n  NOTE: at least one leg is spot, so this price is only as manipulation-resistant\n" +
      "        as the thinnest pool. Grow the LNOC/WETH observation buffer to fix that.",
  );
}

console.log("\nkeeper config:", JSON.stringify(keeperConfig()));

if (process.argv.includes("--run")) {
  console.log("\nrunning a guarded keeper pass…");
  const outcome = await runLnocPriceKeeper({ force: true });
  console.log(JSON.stringify(outcome, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
}

process.exit(0);
