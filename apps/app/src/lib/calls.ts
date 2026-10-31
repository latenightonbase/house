/**
 * Paid calls with Bill — the client for the API's `/calls/*` routes. The
 * caller pays a fixed USDG or LNOC amount straight to the house wallet, the
 * API checks the transfer on-chain and hands back a single-use Calendly link.
 */

import type { CallPurpose } from "@/lib/constants";

export type CallToken = { address: `0x${string}`; symbol: string; decimals: number };

export type CallConfig = {
  available: boolean;
  minutes: number;
  recipient: `0x${string}` | null;
  /**
   * `amount` is in whole tokens, as a decimal string. `usd` is set when the
   * price is a dollar figure converted at today's rate — the amount is then a
   * quote, and the order fixes the exact figure.
   */
  prices: Array<{ token: CallToken; amount: string; usd: number | null }>;
};

export type CallBookingStatus = "AWAITING_PAYMENT" | "PAID" | "SCHEDULED";

export type CallBooking = {
  id: string;
  status: CallBookingStatus;
  /** Which door the caller came through — a plain call, a guest spot or a sponsorship. */
  purpose: CallPurpose;
  token: CallToken;
  amountRaw: string;
  amount: string;
  recipient: `0x${string}`;
  txHash: string | null;
  paidAt: string | null;
  /** Set while PAID: the single-use link to book with. */
  schedulingUrl: string | null;
  startTime: string | null;
  endTime: string | null;
  cancelUrl: string | null;
  rescheduleUrl: string | null;
  createdAt: string;
};

/** An API refusal, with the status so callers can tell "not yet" (504) from "no". */
export class CallRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new CallRequestError(data.error || `Request failed: ${path}`, res.status);
  return data;
}

export function fetchCallConfig(purpose: CallPurpose) {
  return request<CallConfig>(`/backend/calls/config?purpose=${purpose}`);
}

export async function fetchMyCalls() {
  return (await request<{ bookings: CallBooking[] }>("/backend/calls/mine")).bookings;
}

export async function orderCall(tokenAddress: string, purpose: CallPurpose) {
  return (
    await request<{ booking: CallBooking }>("/backend/calls", { tokenAddress, purpose })
  ).booking;
}

/** A paid call as the admin panel sees it: the booking plus who paid. */
export type AdminCallBooking = CallBooking & {
  payerWallet: string | null;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    avatarUrl: string | null;
    wallet: string | null;
  };
};

/** Every paid call, newest first — SUPERADMIN only. */
export async function fetchAdminCalls(purpose?: CallPurpose) {
  const qs = purpose ? `?purpose=${purpose}` : "";
  return (await request<{ bookings: AdminCallBooking[] }>(`/backend/admin/calls${qs}`)).bookings;
}

/**
 * Asks the API to find a payment the page has no hash for — the wallet sent it
 * and then reported an error. Returns the bookings it paid, usually none or one.
 */
export async function recoverCallPayments() {
  return (await request<{ bookings: CallBooking[] }>("/backend/calls/recover", {})).bookings;
}

export async function confirmCallPayment(id: string, txHash: string) {
  return (
    await request<{ booking: CallBooking }>(`/backend/calls/${id}/confirm`, { txHash })
  ).booking;
}

export async function confirmCallScheduled(id: string, inviteeUri: string) {
  return (
    await request<{ booking: CallBooking }>(`/backend/calls/${id}/scheduled`, { inviteeUri })
  ).booking;
}

/**
 * A payment sent but not yet verified, kept across reloads: a tab closed while
 * the transfer confirms would otherwise leave money paid and no booking.
 */
const PENDING_KEY = "lnoc:call-payment";

export type PendingCallPayment = { bookingId: string; txHash: string };

export function readPendingPayment(): PendingCallPayment | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const value = raw ? (JSON.parse(raw) as PendingCallPayment) : null;
    return value?.bookingId && value.txHash ? value : null;
  } catch {
    return null;
  }
}

export function writePendingPayment(value: PendingCallPayment | null) {
  try {
    if (value) localStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked — the payment still verifies in this tab.
  }
}
