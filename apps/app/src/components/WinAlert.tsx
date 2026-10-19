"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, X } from "lucide-react";
import { ContactButton } from "@/components/profile/ContactButton";
import { useSession } from "@/components/SessionProvider";
import { formatAmount, fetchMyProfileOverview, type PurchaseRecord } from "@/lib/profileHistory";
import { UserLink } from "@/components/UserLink";

/** Older wins than this are history, not news. */
const RECENT_MS = 14 * 24 * 60 * 60 * 1000;
const DISMISSED_KEY = "house:win-alert-dismissed";

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    // Storage blocked — the banner just comes back next visit.
  }
}

/**
 * The only in-app signal that an auction was won. Settlement runs on a server
 * ticker long after the winner has left the page, and the email it sends needs
 * a verified address, so without this a winner has no prompt to reach the
 * seller at all. Shows the newest recent win until it is messaged or dismissed.
 */
export function WinAlert() {
  const { status } = useSession();
  const pathname = usePathname();
  const [win, setWin] = useState<PurchaseRecord | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setWin(null);
      return;
    }
    let cancelled = false;
    fetchMyProfileOverview()
      .then((overview) => {
        if (cancelled) return;
        const dismissed = new Set(readDismissed());
        const cutoff = Date.now() - RECENT_MS;
        setWin(
          overview.purchases.find(
            (p) =>
              p.via === "AUCTION_WIN" &&
              new Date(p.at).getTime() >= cutoff &&
              !dismissed.has(p.listingId),
          ) ?? null,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  // The listing page has its own result panel, and chat is where the button leads.
  if (!win || pathname === `/listings/${win.listingId}` || pathname.startsWith("/chat")) {
    return null;
  }

  function dismiss() {
    if (!win) return;
    writeDismissed([...readDismissed(), win.listingId]);
    setWin(null);
  }

  return (
    <div
      role="status"
      className="tile mb-4 flex items-start gap-3 border-warning/35 bg-warning/[0.07] px-4 py-3 sm:items-center"
    >
      <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-warning sm:mt-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-white">
          You won{" "}
          <Link href={`/listings/${win.listingId}`} className="font-semibold hover:text-primary-light">
            {win.title}
          </Link>{" "}
          for <span className="numeric">{formatAmount(win.amount, win.currency)}</span>.{" "}
          <span className="text-caption">
            Message{" "}
            <UserLink handle={win.seller.handle} className="text-white/85">
              {win.seller.name}
            </UserLink>{" "}
            to arrange it.
          </span>
        </p>
        {win.seller.userId && (
          // Messaging counts as seen, but the banner stays put until the chat
          // page takes over, so a failed open can still show its error.
          <div onClickCapture={() => writeDismissed([...readDismissed(), win.listingId])} className="shrink-0">
            <ContactButton userId={win.seller.userId} listingId={win.listingId} label="Message creator" />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-caption transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
