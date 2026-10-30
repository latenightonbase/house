"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, PhoneOff } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, Badge, Card, Panel, Tabs, Tile, type BadgeVariant } from "@/components/ui";
import { fetchAdminCalls, type AdminCallBooking } from "@/lib/calls";
import { robinhood } from "@/lib/chains";
import type { CallPurpose } from "@/lib/constants";
import { shortAddress } from "@/lib/utils";
import { AdminTabs } from "../AdminTabs";

type Filter = CallPurpose | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "appear", label: "Appear" },
  { value: "sponsor", label: "Sponsor" },
  { value: "call", label: "Call" },
];

const PURPOSE_BADGE: Record<CallPurpose, { label: string; variant: BadgeVariant }> = {
  appear: { label: "Appear on a show", variant: "accent" },
  sponsor: { label: "Sponsor a show", variant: "warning" },
  call: { label: "Call", variant: "neutral" },
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAmount(amount: string) {
  return Number(amount).toLocaleString("en-US", { maximumFractionDigits: 4 });
}

/**
 * Who has paid for time with Bill and why — a guest spot, a sponsorship or a
 * plain call — so the right people get the right follow-up. Read-only: the
 * booking itself lives in Calendly.
 */
export default function AdminCallsClient() {
  const [filter, setFilter] = useState<Filter>("all");
  const [bookings, setBookings] = useState<AdminCallBooking[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setBookings(null);
    fetchAdminCalls(filter === "all" ? undefined : filter)
      .then((next) => {
        if (!active) return;
        setBookings(next);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : "Could not load calls.");
      });
    return () => {
      active = false;
    };
  }, [filter]);

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader
        title="Admin · Calls"
        subtitle="Everyone who has paid for a call with Bill, and what they want — to appear on a show, to sponsor one, or just to talk."
        action={<AdminTabs />}
      />

      <Tabs items={FILTERS} value={filter} onChange={setFilter} />

      {loadError && (
        <Tile className="border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
          {loadError}
        </Tile>
      )}

      {bookings === null && !loadError ? (
        <div className="card h-40 animate-pulse bg-white/[0.03]" />
      ) : bookings?.length === 0 ? (
        <Panel className="flex flex-col items-center gap-2 py-12 text-center">
          <PhoneOff className="w-7 h-7 text-caption" aria-hidden="true" />
          <p className="text-[14px] font-semibold text-white">No paid calls yet</p>
          <p className="text-[12px] text-caption max-w-sm">
            Calls show here once the payment has been verified on-chain.
          </p>
        </Panel>
      ) : (
        <ul className="space-y-2">
          {bookings?.map((call) => {
            const badge = PURPOSE_BADGE[call.purpose] ?? PURPOSE_BADGE.call;
            const name = call.user.username ?? (call.user.wallet ? shortAddress(call.user.wallet) : "Unknown");
            const handle = call.user.username ?? call.user.id;
            return (
              <li key={call.id}>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={call.user.avatarUrl}
                      alt={name}
                      fallbackSeed={call.user.wallet ?? call.user.id}
                      fallback={name.slice(0, 2).toUpperCase()}
                      size={40}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/user/${handle}`}
                          className="truncate text-[14px] font-semibold text-white transition-colors hover:text-primary-light"
                        >
                          {name}
                        </Link>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <Badge variant={call.status === "SCHEDULED" ? "positive" : "neutral"}>
                          {call.status === "SCHEDULED" ? "Booked" : "Paid · no time yet"}
                        </Badge>
                      </div>
                      {call.user.email && (
                        <a
                          href={`mailto:${call.user.email}`}
                          className="block truncate text-[12px] text-primary-light hover:underline"
                        >
                          {call.user.email}
                        </a>
                      )}
                      <p className="text-[12px] text-caption">
                        {call.startTime ? (
                          <span className="text-white">{formatWhen(call.startTime)}</span>
                        ) : (
                          "No slot picked"
                        )}
                        {" · "}
                        <span className="numeric">
                          {formatAmount(call.amount)} {call.token.symbol}
                        </span>
                        {call.paidAt && <> · paid {formatWhen(call.paidAt)}</>}
                        {call.txHash && (
                          <>
                            {" · "}
                            <a
                              href={`${robinhood.blockExplorers.default.url}/tx/${call.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-primary-light hover:underline"
                            >
                              tx <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
