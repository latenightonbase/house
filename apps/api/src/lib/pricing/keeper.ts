import {
  auctionHouseAbi,
  auctionHouseAddress,
  operatorAccount,
  publicClient,
  walletClient,
} from "../operator";
import { lnocTokenAddress, readLnocUsdPrice, type LnocPriceReading } from "./lnocPrice";

/**
 * Publishes LNOC's USD rate on-chain.
 *
 * The contract cannot read a market — `_usdToToken` divides by the stored
 * `usdPriceE8` — so something has to keep that number honest. This is that
 * something: it derives the price from Uniswap pools (never a third-party API,
 * which would put an HTTP endpoint inside the payment path) and writes it with
 * `setTokenUsdPrice`.
 *
 * Every guard here exists because LNOC's pool is thin (~$16k). A price that can
 * be shoved with a modest swap must never be written to a contract that settles
 * real listings, so the keeper refuses far more readily than it writes:
 *
 * - a move larger than `maxMovePct` is treated as suspect and never published,
 *   because whether it is manipulation or a genuine crash, a human should look
 * - `requireTwap` refuses any spot-derived price outright, for once the LNOC
 *   pool's observation buffer has been grown
 * - a change under `minChangePct` is skipped, so the keeper does not burn gas
 *   republishing noise
 *
 * Refusing leaves the last good rate in place. With `maxAge = 0` that rate stays
 * usable, so a refusal degrades to slightly stale pricing rather than halting
 * payments — deliberately the safer failure.
 */

const tokenConfigAbi = [
  {
    type: "function",
    name: "tokenConfig",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "accepted", type: "bool" },
      { name: "decimals", type: "uint8" },
      { name: "usdPriceE8", type: "uint256" },
      { name: "updatedAt", type: "uint64" },
      { name: "maxAge", type: "uint64" },
    ],
  },
] as const;

export type KeeperOutcome =
  | { status: "disabled" }
  | { status: "skipped"; reason: string; reading?: LnocPriceReading }
  | { status: "refused"; reason: string; reading: LnocPriceReading; onChainE8: bigint }
  | { status: "published"; reading: LnocPriceReading; fromE8: bigint; toE8: bigint; txHash: string };

function flag(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

function num(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function keeperEnabled() {
  return flag("LNOC_PRICE_KEEPER", false);
}

export function keeperConfig() {
  return {
    enabled: keeperEnabled(),
    maxMovePct: num("LNOC_KEEPER_MAX_MOVE_PCT", 20),
    minChangePct: num("LNOC_KEEPER_MIN_CHANGE_PCT", 1),
    requireTwap: flag("LNOC_KEEPER_REQUIRE_TWAP", false),
    intervalMs: num("LNOC_KEEPER_INTERVAL_MS", 300_000),
  };
}

let lastRunAt = 0;

/**
 * One keeper pass. Safe to call on a fast ticker — it rate-limits itself to
 * `intervalMs` so the cadence is configuration, not a second scheduler.
 */
export async function runLnocPriceKeeper(opts?: { force?: boolean }): Promise<KeeperOutcome> {
  const config = keeperConfig();
  if (!config.enabled && !opts?.force) return { status: "disabled" };

  const now = Date.now();
  if (!opts?.force && now - lastRunAt < config.intervalMs) {
    return { status: "skipped", reason: "within interval" };
  }
  lastRunAt = now;

  const account = operatorAccount();
  const wallet = walletClient();
  if (!account || !wallet) {
    return { status: "skipped", reason: "OPERATOR_PRIVATE_KEY unset" };
  }

  const token = lnocTokenAddress();
  const house = auctionHouseAddress();

  const config_ = await publicClient().readContract({
    address: house,
    abi: tokenConfigAbi,
    functionName: "tokenConfig",
    args: [token],
  });
  const accepted = config_[0];
  const onChainE8 = config_[2];

  // setTokenUsdPrice reverts for an unregistered token. Adding one is an owner
  // decision about what the house accepts, not something a keeper should do.
  if (!accepted) {
    return { status: "skipped", reason: "LNOC is not an accepted token — run setToken first" };
  }

  const reading = await readLnocUsdPrice();

  if (!Number.isFinite(reading.usd) || reading.usd <= 0) {
    return { status: "refused", reason: "derived a non-positive price", reading, onChainE8 };
  }
  if (reading.usdPriceE8 <= 0n) {
    return { status: "refused", reason: "price rounds to zero at 8 decimals", reading, onChainE8 };
  }
  if (config.requireTwap && reading.source !== "twap") {
    return {
      status: "refused",
      reason: `LNOC_KEEPER_REQUIRE_TWAP is on and the price came from spot (LNOC/WETH pool cardinality ${reading.legs.lnocWeth.observationCardinality})`,
      reading,
      onChainE8,
    };
  }

  // A first publish has no prior to compare against, so the bounds cannot apply.
  if (onChainE8 > 0n) {
    const movePct = Math.abs(Number(reading.usdPriceE8 - onChainE8) / Number(onChainE8)) * 100;

    if (movePct > config.maxMovePct) {
      return {
        status: "refused",
        reason: `move of ${movePct.toFixed(2)}% exceeds the ${config.maxMovePct}% bound`,
        reading,
        onChainE8,
      };
    }
    if (movePct < config.minChangePct) {
      return { status: "skipped", reason: `move of ${movePct.toFixed(3)}% is below the publish threshold`, reading };
    }
  }

  const txHash = await wallet.writeContract({
    address: house,
    abi: auctionHouseAbi,
    functionName: "setTokenUsdPrice",
    args: [token, reading.usdPriceE8],
    account,
  });
  const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === "reverted") {
    return { status: "refused", reason: "setTokenUsdPrice reverted", reading, onChainE8 };
  }

  console.log(
    `[lnoc-keeper] published $${reading.usd.toFixed(8)} (${reading.usdPriceE8} e8, ${reading.source}) tx=${txHash}`,
  );
  return { status: "published", reading, fromE8: onChainE8, toE8: reading.usdPriceE8, txHash };
}

/** Logs anything a human should see; quiet on the ordinary skip paths. */
export function logKeeperOutcome(outcome: KeeperOutcome) {
  if (outcome.status === "refused") {
    console.warn(`[lnoc-keeper] REFUSED to publish: ${outcome.reason}`);
  } else if (outcome.status === "skipped" && outcome.reason.includes("not an accepted token")) {
    console.warn(`[lnoc-keeper] ${outcome.reason}`);
  }
}
