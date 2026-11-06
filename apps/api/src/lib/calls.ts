import {
  decodeEventLog,
  erc20Abi,
  formatUnits,
  getAddress,
  parseAbiItem,
  parseUnits,
  type Hash,
} from "viem";
import type { CallBooking, CallPurpose } from "@prisma/client";
import { prisma } from "../db";
import { publicClient } from "./operator";
import { LNOC, USDG, findListingToken, type ListingToken } from "./tokens";
import { getTokenUsdPrice } from "./tokenPrices";
import {
  calendlyConfigured,
  createSingleUseLink,
  getInvitee,
  getScheduledEvent,
  type CalendlyInvitee,
} from "./calendly";

/**
 * Paid calls with Bill: pay a fixed amount of USDG or LNOC to the house
 * wallet, then book a 30-minute slot on his Calendly.
 *
 * Money moves as a plain ERC-20 `transfer` — no contract of ours is involved —
 * so the proof of payment is the Transfer log itself: right token, from one of
 * the caller's linked wallets, to the configured recipient, for at least the
 * ordered amount, in a block mined after the order. Each tx hash pays for one
 * booking only.
 */

export const CALL_MINUTES = 30;

/** Transfers mined this long before the order still count — clocks drift. */
const ORDER_CLOCK_SLACK_S = 5 * 60;

/**
 * `amount` is in whole tokens. `usd` is set when the price is a dollar figure
 * converted to the token at today's rate, rather than a fixed token amount.
 */
export type CallPrice = { token: ListingToken; amount: string; usd: number | null };

/**
 * Guest spots and sponsorships are priced in dollars and paid in LNOC. The
 * token amount is worked out from LNOC's market price when the order is made
 * and fixed on the booking from then on.
 */
const USD_PRICES: Partial<Record<CallPurpose, number>> = { APPEAR: 300, SPONSOR: 2000 };

/** Significant figures kept in a converted amount — rounded up, so the house is never short. */
const CONVERTED_SIG_FIGS = 4;

function tokensForUsd(usd: number, tokenUsd: number, decimals: number): string | null {
  if (!(tokenUsd > 0)) return null;
  const exact = usd / tokenUsd;
  const step = 10 ** (Math.floor(Math.log10(exact)) - CONVERTED_SIG_FIGS + 1);
  const places = Math.min(Math.max(0, -Math.floor(Math.log10(step))), decimals);
  const rounded = Math.ceil(exact / step) * step;
  return rounded.toFixed(places);
}

function priceFor(token: ListingToken): string | null {
  const raw =
    token.address === USDG.address
      ? process.env.CALL_PRICE_USDG
      : token.address === LNOC.address
        ? process.env.CALL_PRICE_LNOC
        : undefined;
  const value = raw?.trim();
  if (!value || !/^\d+(\.\d+)?$/.test(value) || Number(value) <= 0) return null;
  return value;
}

/**
 * The tokens a call can be paid in, each with its price. A plain call uses the
 * fixed amounts from env; a dollar-priced one is LNOC only, and has no price
 * while LNOC's market price is unknown.
 */
export async function callPrices(purpose: CallPurpose): Promise<CallPrice[]> {
  const usd = USD_PRICES[purpose];
  if (usd != null) {
    const lnocUsd = await getTokenUsdPrice(LNOC.address);
    const amount = lnocUsd == null ? null : tokensForUsd(usd, lnocUsd, LNOC.decimals);
    return amount ? [{ token: LNOC, amount, usd }] : [];
  }
  return [USDG, LNOC].flatMap((token) => {
    const amount = priceFor(token);
    return amount ? [{ token, amount, usd: null }] : [];
  });
}

export function callRecipient(): `0x${string}` | null {
  const raw = process.env.CALL_PAYMENT_RECIPIENT?.trim();
  if (!raw || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return getAddress(raw);
}

/** Why calls can't be sold right now, or null when they can. `prices` is `callPrices(purpose)`. */
export function callsUnavailableReason(purpose: CallPurpose, prices: CallPrice[]): string | null {
  if (!callRecipient()) return "CALL_PAYMENT_RECIPIENT is not set";
  if (prices.length === 0) {
    return USD_PRICES[purpose] != null
      ? "LNOC has no market price right now"
      : "Neither CALL_PRICE_USDG nor CALL_PRICE_LNOC is set";
  }
  if (!calendlyConfigured()) return "CALENDLY_TOKEN is not set";
  return null;
}

/** The purposes as the app names them, in the URL and the request body. */
export const CALL_PURPOSES = ["call", "appear", "sponsor"] as const;
export type CallPurposeName = (typeof CALL_PURPOSES)[number];

export function toCallPurpose(name: CallPurposeName | undefined): CallPurpose {
  return (name ?? "call").toUpperCase() as CallPurpose;
}

export function publicCallBooking(booking: CallBooking) {
  return {
    id: booking.id,
    status: booking.status,
    purpose: booking.purpose.toLowerCase() as CallPurposeName,
    token: {
      address: booking.tokenAddress,
      symbol: booking.tokenSymbol,
      decimals: booking.tokenDecimals,
    },
    amountRaw: booking.amountRaw,
    amount: formatUnits(BigInt(booking.amountRaw), booking.tokenDecimals),
    recipient: booking.recipient,
    txHash: booking.txHash,
    paidAt: booking.paidAt,
    schedulingUrl: booking.status === "PAID" ? booking.schedulingUrl : null,
    startTime: booking.startTime,
    endTime: booking.endTime,
    cancelUrl: booking.status === "SCHEDULED" ? booking.cancelUrl : null,
    rescheduleUrl: booking.status === "SCHEDULED" ? booking.rescheduleUrl : null,
    createdAt: booking.createdAt,
  };
}

export class CallError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/**
 * An order at today's price. An unpaid order for the same token, amount and
 * purpose is reused, so a caller who backs out and comes back does not pile up rows.
 */
export async function orderCall(userId: string, tokenAddress: string, purpose: CallPurpose) {
  const prices = await callPrices(purpose);
  const unavailable = callsUnavailableReason(purpose, prices);
  if (unavailable) throw new CallError("Calls aren't open for booking yet.", 503);

  const token = findListingToken(tokenAddress);
  const price = token && prices.find((p) => p.token.address === token.address);
  if (!token || !price) {
    throw new CallError(prices.length === 1 ? `Pay with ${prices[0].token.symbol}.` : "Pay with USDG or LNOC.");
  }

  const amountRaw = parseUnits(price.amount, token.decimals).toString();
  const recipient = callRecipient()!.toLowerCase();

  const existing = await prisma.callBooking.findFirst({
    where: {
      userId,
      status: "AWAITING_PAYMENT",
      purpose,
      tokenAddress: token.address,
      amountRaw,
      recipient,
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.callBooking.create({
    data: {
      userId,
      purpose,
      tokenAddress: token.address,
      tokenSymbol: token.symbol,
      tokenDecimals: token.decimals,
      amountRaw,
      recipient,
    },
  });
}

/** How long the API waits for a just-sent transfer to be mined. */
const RECEIPT_TIMEOUT_MS = 90_000;

/**
 * Verifies the transfer that pays for `bookingId` and marks it PAID. Safe to
 * call again with the same hash — a booking already paid by it just returns.
 */
export async function confirmCallPayment(userId: string, bookingId: string, txHash: string) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) throw new CallError("That isn't a transaction hash.");
  const hash = txHash.toLowerCase() as Hash;

  const booking = await prisma.callBooking.findFirst({ where: { id: bookingId, userId } });
  if (!booking) throw new CallError("Booking not found.", 404);
  if (booking.status !== "AWAITING_PAYMENT") {
    if (booking.txHash === hash) return booking;
    throw new CallError("This booking is already paid.", 409);
  }

  const claimed = await prisma.callBooking.findUnique({ where: { txHash: hash } });
  if (claimed) throw new CallError("That transaction already paid for a call.", 409);

  const wallets = await prisma.wallet.findMany({ where: { userId }, select: { address: true } });
  const mine = new Set(wallets.map((w) => w.address.toLowerCase()));

  const client = publicClient();
  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS });
  } catch {
    throw new CallError(
      "The payment hasn't confirmed yet. Give it a minute, then try again.",
      504,
    );
  }
  if (receipt.status !== "success") throw new CallError("That transaction reverted.");

  const want = BigInt(booking.amountRaw);
  const token = booking.tokenAddress.toLowerCase();
  let payer: string | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== token) continue;
    try {
      const decoded = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics });
      if (decoded.eventName !== "Transfer") continue;
      const { from, to, value } = decoded.args;
      if (
        to.toLowerCase() === booking.recipient &&
        mine.has(from.toLowerCase()) &&
        value >= want
      ) {
        payer = from.toLowerCase();
        break;
      }
    } catch {
      // Not a Transfer this ABI can decode.
    }
  }
  if (!payer) {
    throw new CallError(
      `That transaction doesn't send ${formatUnits(want, booking.tokenDecimals)} ${booking.tokenSymbol} from your wallet to the house wallet.`,
    );
  }

  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  const orderedAt = Math.floor(booking.createdAt.getTime() / 1000);
  if (Number(block.timestamp) < orderedAt - ORDER_CLOCK_SLACK_S) {
    throw new CallError("That transfer was made before this booking was started.");
  }

  // `txHash` is unique, so a hash raced onto two bookings fails here.
  try {
    return await prisma.callBooking.update({
      where: { id: booking.id, status: "AWAITING_PAYMENT" },
      data: { status: "PAID", txHash: hash, payerWallet: payer, paidAt: new Date() },
    });
  } catch {
    throw new CallError("That transaction already paid for a call.", 409);
  }
}

/** How far back a payment is looked for without its hash. */
const RECOVERY_WINDOW_S = 2 * 24 * 60 * 60;

/**
 * Comfortably above Robinhood Chain's ~10 blocks a second, so the log search
 * always starts before the order. Two days at this rate is ~2.6M blocks, which
 * the RPC answers in one call when sender and recipient are each a single value.
 */
const MAX_BLOCKS_PER_S = 15;

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

/**
 * Finds payments for a caller's unpaid orders without being told the tx hash.
 * Some wallets broadcast the transfer and then report an error anyway ("nonce
 * too low" from a retried send), so the page never learns the hash and the
 * money sits in the house wallet against an unpaid order. This looks for
 * transfers from the caller's wallets to the recipient since their oldest
 * open order and runs each through `confirmCallPayment`, which makes every
 * check the hash route does. Returns the bookings it paid.
 */
export async function recoverCallPayments(userId: string): Promise<CallBooking[]> {
  const open = await prisma.callBooking.findMany({
    where: {
      userId,
      status: "AWAITING_PAYMENT",
      createdAt: { gte: new Date(Date.now() - RECOVERY_WINDOW_S * 1000) },
    },
    orderBy: { createdAt: "asc" },
  });
  if (open.length === 0) return [];

  const wallets = await prisma.wallet.findMany({ where: { userId }, select: { address: true } });
  if (wallets.length === 0) return [];
  const from = wallets.map((w) => getAddress(w.address));

  const client = publicClient();
  const latest = await client.getBlock();
  const earliest = Math.floor(open[0].createdAt.getTime() / 1000) - ORDER_CLOCK_SLACK_S;
  const back = BigInt(Math.ceil((Number(latest.timestamp) - earliest) * MAX_BLOCKS_PER_S));
  const fromBlock = latest.number > back ? latest.number - back : 0n;

  const paid: CallBooking[] = [];
  const pairs = new Map(open.map((b) => [`${b.tokenAddress}|${b.recipient}`, b]));
  for (const { tokenAddress, recipient } of pairs.values()) {
    // One sender per query: the RPC allows a long range only when each topic
    // has a single value, and caps a multi-value query at 100k blocks.
    const perWallet = await Promise.all(
      from.map((wallet) =>
        client.getLogs({
          address: tokenAddress as `0x${string}`,
          event: transferEvent,
          args: { from: wallet, to: recipient as `0x${string}` },
          fromBlock,
          toBlock: latest.number,
        }),
      ),
    );
    const logs = perWallet
      .flat()
      .sort((a, b) =>
        a.blockNumber === b.blockNumber
          ? a.logIndex - b.logIndex
          : a.blockNumber < b.blockNumber
            ? -1
            : 1,
      );

    for (const log of logs) {
      const hash = log.transactionHash?.toLowerCase();
      const value = log.args.value;
      if (!hash || value == null) continue;
      if (await prisma.callBooking.findUnique({ where: { txHash: hash } })) continue;

      const block = await client.getBlock({ blockNumber: log.blockNumber });
      const minedAt = Number(block.timestamp);
      // The newest order this transfer could have been for: same token and
      // wallet, made before it was mined, and not asking for more than it sent.
      const booking = open
        .filter(
          (b) =>
            b.tokenAddress === tokenAddress &&
            b.recipient === recipient &&
            BigInt(b.amountRaw) <= value &&
            Math.floor(b.createdAt.getTime() / 1000) - ORDER_CLOCK_SLACK_S <= minedAt,
        )
        .at(-1);
      if (!booking) continue;

      try {
        paid.push(await confirmCallPayment(userId, booking.id, hash));
        open.splice(open.indexOf(booking), 1);
      } catch (err) {
        console.warn(`[calls] recovery skipped ${hash}:`, err instanceof Error ? err.message : err);
      }
    }
  }
  return paid;
}

/**
 * Gives a PAID booking a single-use Calendly link if it has none — after
 * payment, or after a cancelled call freed the payment up again.
 */
export async function ensureSchedulingLink(booking: CallBooking): Promise<CallBooking> {
  if (booking.status !== "PAID" || booking.schedulingUrl) return booking;
  const url = await createSingleUseLink();
  // Only fill an empty slot — two tabs racing here must not swap links under each other.
  const { count } = await prisma.callBooking.updateMany({
    where: { id: booking.id, status: "PAID", schedulingUrl: null },
    data: { schedulingUrl: url },
  });
  if (count === 0) return prisma.callBooking.findUniqueOrThrow({ where: { id: booking.id } });
  return { ...booking, schedulingUrl: url };
}

/** Records a Calendly invitee against a booking: the call is on the calendar. */
async function recordInvitee(bookingId: string, invitee: CalendlyInvitee) {
  const event = await getScheduledEvent(invitee.event);
  return prisma.callBooking.update({
    where: { id: bookingId },
    data: {
      status: "SCHEDULED",
      calendlyEventUri: invitee.event,
      calendlyInviteeUri: invitee.uri,
      startTime: new Date(event.start_time),
      endTime: new Date(event.end_time),
      cancelUrl: invitee.cancel_url,
      rescheduleUrl: invitee.reschedule_url,
      scheduledAt: new Date(),
    },
  });
}

/**
 * The booking an invitee belongs to. The embed tags every booking with the
 * booking id as `utm_content`; a rescheduled invitee is also found through
 * the invitee it replaced.
 */
async function bookingForInvitee(invitee: CalendlyInvitee) {
  const tagged = invitee.tracking?.utm_content;
  if (tagged) {
    const booking = await prisma.callBooking.findUnique({ where: { id: tagged } });
    if (booking && booking.status !== "AWAITING_PAYMENT") return booking;
  }
  if (invitee.old_invitee) {
    return prisma.callBooking.findUnique({ where: { calendlyInviteeUri: invitee.old_invitee } });
  }
  return null;
}

/**
 * The embed reports a booking straight away; this reads the invitee back from
 * Calendly rather than taking the browser's word for it, and only accepts one
 * tagged with this booking.
 */
export async function confirmScheduled(userId: string, bookingId: string, inviteeUri: string) {
  const booking = await prisma.callBooking.findFirst({ where: { id: bookingId, userId } });
  if (!booking) throw new CallError("Booking not found.", 404);
  if (booking.status === "SCHEDULED" && booking.calendlyInviteeUri === inviteeUri) return booking;
  if (booking.status !== "PAID") throw new CallError("This booking isn't waiting for a time.", 409);

  let invitee: CalendlyInvitee;
  try {
    invitee = await getInvitee(inviteeUri);
  } catch {
    throw new CallError("Couldn't find that booking on Calendly.");
  }
  if (invitee.tracking?.utm_content !== booking.id || invitee.status !== "active") {
    throw new CallError("That Calendly booking isn't for this call.");
  }
  return recordInvitee(booking.id, invitee);
}

/** Applies an `invitee.created` or `invitee.canceled` webhook. Unknown invitees are ignored. */
export async function applyInviteeWebhook(
  event: string,
  invitee: CalendlyInvitee,
): Promise<"applied" | "ignored"> {
  if (event === "invitee.created") {
    const booking = await bookingForInvitee(invitee);
    if (!booking) return "ignored";
    if (booking.calendlyInviteeUri === invitee.uri) return "applied";
    await recordInvitee(booking.id, invitee);
    return "applied";
  }

  if (event === "invitee.canceled") {
    // A reschedule cancels the old invitee and creates a new one; the
    // `invitee.created` for the new one moves the booking over.
    if (invitee.rescheduled) return "ignored";
    const booking = await prisma.callBooking.findUnique({
      where: { calendlyInviteeUri: invitee.uri },
    });
    if (!booking) return "ignored";
    // The payment still stands. The single-use link was spent on the call
    // that was just cancelled, so it is cleared and the next visit gets a new one.
    await prisma.callBooking.update({
      where: { id: booking.id },
      data: {
        status: "PAID",
        schedulingUrl: null,
        calendlyEventUri: null,
        calendlyInviteeUri: null,
        startTime: null,
        endTime: null,
        cancelUrl: null,
        rescheduleUrl: null,
        scheduledAt: null,
      },
    });
    return "applied";
  }

  return "ignored";
}

export function listCallBookings(userId: string) {
  return prisma.callBooking.findMany({
    where: { userId, status: { not: "AWAITING_PAYMENT" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

/**
 * Every paid call for the admin panel, newest first, with who paid. Unpaid
 * orders are left out — they are only someone who opened their wallet.
 */
export function listAllCallBookings(purpose?: CallPurpose) {
  return prisma.callBooking.findMany({
    where: { status: { not: "AWAITING_PAYMENT" }, ...(purpose ? { purpose } : {}) },
    orderBy: { paidAt: "desc" },
    take: 200,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          wallets: { select: { address: true }, orderBy: { createdAt: "asc" }, take: 1 },
        },
      },
    },
  });
}
