"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { useSession } from "@/components/SessionProvider";
import { erc20Abi } from "@/lib/contracts/erc20";
import { robinhood } from "@/lib/chains";
import {
  CallRequestError,
  confirmCallPayment,
  orderCall,
  readPendingPayment,
  writePendingPayment,
  type CallBooking,
  type CallToken,
} from "@/lib/calls";
import type { CallPurpose } from "@/lib/constants";
import { writeError } from "@/lib/useListingCheckout";

export type CallPaymentStep = "idle" | "switching" | "signing" | "confirming" | "verifying";

export const CALL_STEP_LABEL: Record<Exclude<CallPaymentStep, "idle">, string> = {
  switching: "Switch your wallet to Robinhood Chain…",
  signing: "Confirm the payment in your wallet…",
  confirming: "Waiting for the payment to confirm…",
  verifying: "Checking the payment…",
};

/**
 * Paying for a call: order at the current price, transfer the tokens to the
 * house wallet, then have the API verify the transfer. A transfer sent but not
 * yet verified is remembered locally and finished on the next visit.
 */
export function useCallPayment(onPaid: (booking: CallBooking) => void) {
  const { user, status } = useSession();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: robinhood.id });

  const [step, setStep] = useState<CallPaymentStep>("idle");
  const [error, setError] = useState<string | null>(null);
  /** A transfer that went out but wasn't verified — retry sends no second payment. */
  const [unverified, setUnverified] = useState<{ bookingId: string; txHash: string } | null>(
    null,
  );
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const busy = step !== "idle";

  const verify = useCallback(async (bookingId: string, txHash: string) => {
    setStep("verifying");
    try {
      const booking = await confirmCallPayment(bookingId, txHash);
      writePendingPayment(null);
      setUnverified(null);
      setError(null);
      onPaidRef.current(booking);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't verify the payment.";
      // 504: not mined yet. Anything else is a verdict on this transfer —
      // forget it so the caller isn't stuck retrying one that will never pass.
      if (err instanceof CallRequestError && err.status !== 504) {
        writePendingPayment(null);
        setUnverified(null);
      } else {
        setUnverified({ bookingId, txHash });
      }
      setError(message);
    } finally {
      setStep("idle");
    }
  }, []);

  // Finish a payment a previous visit sent but never got verified.
  useEffect(() => {
    if (status !== "authenticated") return;
    const pending = readPendingPayment();
    if (pending) void verify(pending.bookingId, pending.txHash);
  }, [status, verify]);

  /** Returns false when a wallet connection or sign-in is needed first. */
  async function pay(token: CallToken, purpose: CallPurpose): Promise<boolean> {
    if (busy) return true;
    if (status !== "authenticated" || !address) return false;
    setError(null);

    if (unverified) {
      await verify(unverified.bookingId, unverified.txHash);
      return true;
    }

    const linked = user?.wallets.some((w) => w.address.toLowerCase() === address.toLowerCase());
    if (!linked) {
      setError("Connect the wallet you signed in with — the payment has to come from your account.");
      return true;
    }

    let sentHash: `0x${string}` | null = null;
    let bookingId: string | null = null;
    try {
      if (chainId !== robinhood.id) {
        setStep("switching");
        if (!switchChainAsync) throw new Error("Switch your wallet to Robinhood Chain and try again.");
        await switchChainAsync({ chainId: robinhood.id });
      }
      if (!publicClient) throw new Error("Could not reach Robinhood Chain.");

      const booking = await orderCall(token.address, purpose);
      bookingId = booking.id;
      const amount = BigInt(booking.amountRaw);

      const balance = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      });
      if (balance < amount) {
        throw new Error(
          `A call costs ${booking.amount} ${token.symbol} and your wallet holds ${Number(formatUnits(balance, token.decimals)).toLocaleString("en-US", { maximumFractionDigits: 4 })}.`,
        );
      }

      setStep("signing");
      sentHash = await writeContractAsync({
        address: token.address,
        abi: erc20Abi,
        functionName: "transfer",
        args: [booking.recipient, amount],
        account: address,
        chainId: robinhood.id,
      });
      writePendingPayment({ bookingId: booking.id, txHash: sentHash });

      setStep("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: sentHash });
      if (receipt.status === "reverted") {
        writePendingPayment(null);
        sentHash = null;
        throw new Error("The payment transaction reverted.");
      }
    } catch (err) {
      setStep("idle");
      if (sentHash && bookingId) {
        // Sent but the wait failed (RPC hiccup) — the API can still check it.
        setUnverified({ bookingId, txHash: sentHash });
        setError("Your payment was sent but hasn't confirmed here yet. Retry to check it.");
      } else {
        setError(writeError(err, "Could not send the payment."));
      }
      return true;
    }

    if (bookingId && sentHash) await verify(bookingId, sentHash);
    return true;
  }

  return { pay, step, busy, error, unverified: Boolean(unverified), address };
}
