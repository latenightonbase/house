"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseUnits } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Check, Loader2, Pencil, X, Zap } from "lucide-react";
import { EmailVerifyPrompt } from "@/components/EmailVerifyPrompt";
import { useSession } from "@/components/SessionProvider";
import { Labelled, ProjectPitchFields, pitchInputClass } from "./ProjectPitchFields";
import {
  auctionHouseAbi,
  auctionHouseAddress,
  paymentTokens,
  USDG,
} from "@/lib/contracts/auctionHouse";
import { erc20Abi } from "@/lib/contracts/erc20";
import {
  fetchMyProject,
  recordDailyBid,
  saveMyProject,
  type AuctionState,
  type DailyProject,
} from "@/lib/dailyAuction";
import { robinhood } from "@/lib/chains";
import type { Listing } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

type Step = "idle" | "saving" | "switching" | "approving" | "signing" | "confirming" | "done";

const STEP_COPY: Record<Exclude<Step, "idle" | "done">, string> = {
  saving: "Saving your project…",
  switching: "Switch network in your wallet…",
  approving: "Approve the token spend…",
  signing: "Confirm the bid in your wallet…",
  confirming: "Waiting for the transaction…",
};

const EMPTY: DailyProject = {
  name: "",
  description: "",
  imageUrl: "",
  websiteUrl: "",
  twitterUrl: "",
  youtubeUrl: "",
};

function writeError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : "";
  if (/user rejected|denied transaction/i.test(message)) return "You rejected the transaction.";
  if (/insufficient/i.test(message)) return "Not enough balance to cover this bid.";
  return message.split("\n")[0]?.slice(0, 180) || fallback;
}

/**
 * Places a bid on the daily auction, carrying the bidder's project pitch.
 *
 * The pitch is fetched on open and saved to the server before the transaction
 * is signed. That ordering is the point: a bidder fills the form once per
 * auction, and every later bid — including one placed after being outbid —
 * opens straight onto the amount field with the details already filled in and
 * collapsed.
 */
export function BidDialog({
  listing,
  auction,
  open,
  onClose,
  onBidPlaced,
}: {
  listing: Listing;
  auction: AuctionState | null;
  open: boolean;
  onClose: () => void;
  onBidPlaced: (auction: AuctionState) => void;
}) {
  const { user, status } = useSession();
  const { address, chainId: walletChainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const chainForListing = listing.chainId ?? robinhood.id;
  const publicClient = usePublicClient({ chainId: chainForListing });
  const tokens = paymentTokens(chainForListing);
  const token = useMemo(
    () =>
      tokens.find((t) => t.address.toLowerCase() === listing.tokenAddress?.toLowerCase()) ??
      tokens[0] ??
      USDG,
    [tokens, listing.tokenAddress],
  );
  const contractAddress =
    (listing.contractAddress as `0x${string}` | undefined) ??
    auctionHouseAddress(chainForListing);

  const [project, setProject] = useState<DailyProject>(EMPTY);
  /** True once the server confirms a saved pitch — collapses the form. */
  const [hasSavedProject, setHasSavedProject] = useState(false);
  const [editingProject, setEditingProject] = useState(true);
  /** Starts true so Place Bid cannot fire before the pitch request settles. */
  const [loadingProject, setLoadingProject] = useState(true);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const minimumBid = useMemo(() => {
    const current = auction?.currentBid ?? listing.price;
    // The contract rejects a bid that only matches the leader, so ask for more.
    const step = 0.01;
    return auction?.leader ? Math.round((current + step) * 100) / 100 : current;
  }, [auction, listing.price]);

  useEffect(() => setMounted(true), []);

  // Load the saved pitch each time the dialog opens — this is what makes
  // re-bidding after an outbid a single-field action.
  useEffect(() => {
    if (!open) {
      setLoadingProject(true);
      return;
    }
    setError(null);
    setStep("idle");
    setAmount(String(minimumBid));

    let cancelled = false;
    setLoadingProject(true);
    fetchMyProject(listing.id)
      .then((saved) => {
        if (cancelled) return;
        if (saved) {
          setProject({
            name: saved.name,
            description: saved.description ?? "",
            imageUrl: saved.imageUrl ?? "",
            websiteUrl: saved.websiteUrl ?? "",
            twitterUrl: saved.twitterUrl ?? "",
            youtubeUrl: saved.youtubeUrl ?? "",
          });
          setHasSavedProject(true);
          setEditingProject(false);
        } else {
          setProject(EMPTY);
          setHasSavedProject(false);
          setEditingProject(true);
        }
      })
      .finally(() => !cancelled && setLoadingProject(false));

    return () => {
      cancelled = true;
    };
    // `minimumBid` is intentionally read once per open, not tracked — a rival
    // bid landing mid-typing must not overwrite what the user is entering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listing.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && step === "idle" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, step]);

  const bidNumber = Number(amount);
  const bidInvalid = !Number.isFinite(bidNumber) || bidNumber < minimumBid;
  const nameMissing = !project.name.trim();
  const busy = step !== "idle" && step !== "done";
  const formReady = !loadingProject;
  const set = (patch: Partial<DailyProject>) => setProject((p) => ({ ...p, ...patch }));

  async function handleSubmit() {
    if (busy || !formReady) return;
    setError(null);

    if (status !== "authenticated") {
      openConnectModal?.();
      return;
    }
    if (!address) {
      openConnectModal?.();
      return;
    }
    if (nameMissing) {
      setEditingProject(true);
      setError("Your project needs a name.");
      return;
    }
    if (bidInvalid) {
      setError(`Bid at least $${minimumBid.toLocaleString()}.`);
      return;
    }
    if (!contractAddress) {
      setError("This auction is not wired to the AuctionHouse contract.");
      return;
    }

    const pitch: DailyProject = {
      name: project.name.trim(),
      description: project.description?.trim() || null,
      imageUrl: project.imageUrl?.trim() || null,
      websiteUrl: project.websiteUrl?.trim() || null,
      twitterUrl: project.twitterUrl?.trim() || null,
      youtubeUrl: project.youtubeUrl?.trim() || null,
    };

    try {
      // Saved first: if the wallet flow fails, the details survive and the
      // next attempt reopens prefilled.
      setStep("saving");
      await saveMyProject(listing.id, pitch);
      setHasSavedProject(true);

      if (walletChainId !== chainForListing) {
        setStep("switching");
        if (!switchChainAsync) throw new Error("Switch your wallet to the auction's network.");
        await switchChainAsync({ chainId: chainForListing });
      }
      if (!publicClient) throw new Error("Could not reach the auction's network.");

      const value = parseUnits(bidNumber.toFixed(token.decimals), token.decimals);
      const allowance = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, contractAddress],
      });

      if (allowance < value) {
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: token.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [contractAddress, value],
          account: address,
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveHash,
        });
        if (approveReceipt.status === "reverted") {
          throw new Error("The approval transaction reverted.");
        }
      }

      setStep("signing");
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: auctionHouseAbi,
        functionName: "placeBid",
        args: [listing.id, value, user?.username ?? address],
        account: address,
      });

      setStep("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") throw new Error("The transaction reverted.");

      const result = await recordDailyBid(listing.id, bidNumber, hash, pitch);
      onBidPlaced(result.auction);
      setStep("done");
    } catch (err) {
      setError(writeError(err, "Could not place the bid."));
      setStep("idle");
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-background/85 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Place a bid"
      onClick={(e) => e.target === e.currentTarget && step === "idle" && onClose()}
    >
      <div className="card w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-b-none sm:rounded-2xl">
        <header className="sticky top-0 z-10 flex items-start gap-3 px-5 sm:px-6 py-4 bg-surface border-b border-line">
          <div className="min-w-0">
            <p className="eyebrow text-primary-bright">Place bid</p>
            <h2 className="mt-1 text-[17px] font-bold text-white">
              Tomorrow&apos;s Attention Auction
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="ml-auto shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-line text-caption hover:text-white disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {step === "done" ? (
          <div className="px-5 sm:px-6 py-10 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-positive/15 border border-positive/30">
              <Check className="w-6 h-6 text-positive" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-[18px] font-bold text-white">You&apos;re in the lead</h3>
            <p className="mt-2 text-[13px] text-caption leading-relaxed max-w-sm mx-auto">
              Your ${bidNumber.toLocaleString()} bid for{" "}
              <span className="text-white">{project.name}</span> is on-chain. If it holds when the
              clock runs out, your project takes the billboard for 24 hours.
            </p>
            {!user?.emailVerifiedAt ? (
              <EmailVerifyPrompt
                className="mt-6 pt-6 border-t border-line"
                onSkip={onClose}
              />
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="gradient-button mt-6 h-11 px-6 rounded-lg text-white eyebrow"
              >
                Done
              </button>
            )}
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-5 space-y-5">
            {/* ── Project pitch ─────────────────────────── */}
            {loadingProject ? (
              <div className="tile h-20 animate-pulse" />
            ) : hasSavedProject && !editingProject ? (
              <div className="tile px-4 py-3.5 flex items-start gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-positive/15 border border-positive/30 shrink-0">
                  <Check className="w-4 h-4 text-positive" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{project.name}</p>
                  <p className="mt-0.5 text-[11px] text-caption">
                    Your details are saved for this auction — no need to re-enter them.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProject(true)}
                  className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-light hover:text-white"
                >
                  <Pencil className="w-3 h-3" aria-hidden="true" />
                  Edit
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="eyebrow text-primary-light">Your project</p>
                  <p className="mt-1.5 text-[12px] text-caption leading-relaxed">
                    This is what goes on the billboard for 24 hours if you win. You only fill it in
                    once per auction.
                  </p>
                </div>

                <ProjectPitchFields project={project} onChange={set} disabled={busy} />

                {hasSavedProject && (
                  <button
                    type="button"
                    onClick={() => setEditingProject(false)}
                    className="text-[12px] font-semibold text-caption hover:text-white"
                  >
                    ← Collapse details
                  </button>
                )}
              </div>
            )}

            {/* ── Bid amount ────────────────────────────── */}
            <div className="pt-1 border-t border-line space-y-4">
              <Labelled
                label="Your bid"
                hint={`min $${minimumBid.toLocaleString()}`}
                htmlFor="bid-amount"
              >
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-caption">
                    $
                  </span>
                  <input
                    id="bid-amount"
                    ref={amountRef}
                    type="number"
                    inputMode="decimal"
                    min={minimumBid}
                    step={0.01}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={busy || !formReady}
                    className={cn(pitchInputClass, "pl-8 pr-20 numeric text-[16px] font-semibold")}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wider text-caption">
                    {listing.tokenName || listing.currency}
                  </span>
                </div>
              </Labelled>

              {error && (
                <p className="text-[12px] text-negative leading-relaxed" role="alert">
                  {error}
                </p>
              )}

              {busy && (
                <p className="flex items-center gap-2 text-[12px] text-caption">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  {STEP_COPY[step as keyof typeof STEP_COPY]}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={busy || !formReady}
                aria-busy={!formReady || busy}
                className="gradient-button w-full inline-flex items-center justify-center gap-2.5 h-12 rounded-lg text-white text-[13px] uppercase tracking-[0.14em] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!formReady || busy ? (
                  <Loader2 className="w-[17px] h-[17px] animate-spin" aria-hidden="true" />
                ) : (
                  <Zap className="w-[17px] h-[17px]" aria-hidden="true" />
                )}
                {!formReady
                  ? "Loading…"
                  : status !== "authenticated"
                    ? "Connect wallet"
                    : "Place bid"}
              </button>

              <p className="text-[11px] text-caption leading-relaxed text-center">
                Your bid is escrowed on-chain. If you are outbid it is returned, and your project
                details stay saved for your next bid.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
