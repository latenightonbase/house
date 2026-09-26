"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import { formatAmount, formatDate, type PartyIdentity } from "@/lib/profileHistory";

/** The empty and loading states both lists share, so they cannot drift apart. */
export function HistorySkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      {[0, 1].map((i) => (
        <div key={i} className="h-[5.5rem] animate-pulse rounded-xl bg-white/[0.03]" />
      ))}
    </div>
  );
}

export function HistoryEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center">
      <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-caption">{children}</p>
    </div>
  );
}

/**
 * One record: what it was on the left, what it was worth on the right, and the
 * people involved beneath a hairline. The card used to nest a tile inside a
 * tile inside a list — the same information, three borders deep.
 */
export function HistoryRow({
  href,
  title,
  meta,
  amount,
  amountTone = "default",
  children,
}: {
  href: string;
  title: string;
  meta: string;
  amount: string;
  amountTone?: "default" | "positive";
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-4 py-3.5 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="text-[13px] font-semibold text-white transition-colors hover:text-primary-bright"
          >
            {title}
          </Link>
          <p className="mt-0.5 text-[11px] text-caption">{meta}</p>
        </div>
        <p
          className={`numeric shrink-0 text-[15px] font-bold leading-tight ${
            amountTone === "positive" ? "text-positive" : "text-white"
          }`}
        >
          {amount}
        </p>
      </div>
      {children && <div className="mt-3 border-t border-line pt-3">{children}</div>}
    </div>
  );
}

/**
 * A person on a record — the winner of a sale, or the creator behind a
 * purchase. `action` is the contact button where the payload carries an id.
 */
export function PartyRow({
  party,
  caption,
  action,
}: {
  party: PartyIdentity & { amount?: number; currency?: string; at?: string };
  caption?: string;
  action?: ReactNode;
}) {
  const line =
    caption ??
    (party.amount != null && party.at
      ? `${formatAmount(party.amount, party.currency)} · ${formatDate(party.at)}`
      : "");

  return (
    <div className="flex items-center gap-3">
      <Avatar
        src={party.avatarUrl}
        alt={party.name}
        fallbackSeed={party.wallet ?? party.userId ?? party.name}
        fallback={party.name.slice(0, 2).toUpperCase()}
        size={30}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-white">
          {party.username ? (
            <Link
              href={`/user/${party.username}`}
              className="transition-colors hover:text-primary-bright"
            >
              {party.name}
            </Link>
          ) : (
            party.name
          )}
        </p>
        {line && <p className="truncate text-[11px] text-caption">{line}</p>}
      </div>
      {action}
    </div>
  );
}
