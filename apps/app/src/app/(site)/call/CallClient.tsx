"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarCheck, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useOpenConnect } from "@/components/connect-intent";
import { useSession } from "@/components/SessionProvider";
import { TokenMark } from "@/components/listing/TokenMark";
import { CalendlyEmbed } from "@/components/call/CalendlyEmbed";
import { TierButton, TierCard, TierTitle } from "@/components/call/TierCard";
import { Button, Tile } from "@/components/ui";
import { LNOC, USDG, type PaymentToken } from "@/lib/contracts/auctionHouse";
import { robinhood } from "@/lib/chains";
import { CALL_PURPOSES, type CallPurpose } from "@/lib/constants";
import {
  confirmCallScheduled,
  fetchCallConfig,
  fetchMyCalls,
  type CallBooking,
  type CallConfig,
} from "@/lib/calls";
import { formatUsd, usdValue, useTokenPrices } from "@/lib/tokenPrices";
import { CALL_STEP_LABEL, useCallPayment } from "@/lib/useCallPayment";

/** The app's art and metadata for a token the API names by address. */
function paymentToken(address: string): PaymentToken | null {
  return (
    [USDG, LNOC].find((t) => t.address.toLowerCase() === address.toLowerCase()) ?? null
  );
}

function formatAmount(amount: string) {
  return Number(amount).toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** Each token's card colour: USDG's lime from its logo, LNOC in the house violet. */
const TOKEN_STYLE: Record<string, { accent: string; ink: string; tag: string; note: string }> = {
  [USDG.address.toLowerCase()]: {
    accent: "#bef264",
    ink: "#0b0710",
    tag: "Stable",
    note: "Dollar-pegged — the price is the price.",
  },
  [LNOC.address.toLowerCase()]: {
    accent: "#a855f7",
    ink: "#ffffff",
    tag: "House token",
    note: "Pay in Late Night Onchain, the house token.",
  },
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function CallClient({ purpose = "call" }: { purpose?: CallPurpose }) {
  const copy = CALL_PURPOSES[purpose];
  const { status, user } = useSession();
  const openConnect = useOpenConnect();
  const prices = useTokenPrices();

  const [config, setConfig] = useState<CallConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [bookings, setBookings] = useState<CallBooking[]>([]);
  /** The card whose payment is in flight — only that one shows progress. */
  const [payingWith, setPayingWith] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [justBooked, setJustBooked] = useState<CallBooking | null>(null);

  useEffect(() => {
    fetchCallConfig(purpose)
      .then(setConfig)
      .catch(() => setConfigError(true));
  }, [purpose]);

  const loadBookings = useCallback(async () => {
    try {
      setBookings(await fetchMyCalls());
    } catch {
      // Signed out or a blip — the payment card still works.
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") void loadBookings();
    else setBookings([]);
  }, [status, loadBookings]);

  const payment = useCallPayment((paid) => {
    setBookings((current) => [paid, ...current.filter((b) => b.id !== paid.id)]);
  });

  /** A paid call waiting for a time — the calendar takes over the page. */
  const awaitingTime = bookings.find((b) => b.status === "PAID") ?? null;
  const upcoming = bookings
    .filter((b) => b.status === "SCHEDULED" && b.endTime && new Date(b.endTime) > new Date())
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const offers = useMemo(
    () =>
      (config?.prices ?? []).flatMap((price) => {
        const token = paymentToken(price.token.address);
        const style = TOKEN_STYLE[price.token.address.toLowerCase()];
        return token && style ? [{ price, token, style }] : [];
      }),
    [config],
  );

  async function onPay(price: CallConfig["prices"][number]) {
    setPayingWith(price.token.address);
    const ready = await payment.pay(price.token, purpose);
    if (!ready) openConnect();
  }

  async function onScheduled(booking: CallBooking, inviteeUri: string) {
    setScheduleError(null);
    try {
      const scheduled = await confirmCallScheduled(booking.id, inviteeUri);
      setBookings((current) => current.map((b) => (b.id === scheduled.id ? scheduled : b)));
      setJustBooked(scheduled);
    } catch (err) {
      setScheduleError(
        err instanceof Error
          ? `${err.message} Your Calendly confirmation email is the record of the booking.`
          : "Couldn't record the booking here. Your Calendly confirmation email is the record of it.",
      );
    }
  }

  const minutes = config?.minutes ?? 30;
  const signedIn = status === "authenticated" && Boolean(payment.address);

  return (
    <PageShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      titleAccent={copy.titleAccent}
      intro={copy.intro(minutes)}
    >
      {justBooked?.startTime && (
        <Tile
          role="status"
          className="flex items-start gap-3 border-positive/30 bg-positive/10 px-4 py-3.5"
        >
          <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-positive" aria-hidden="true" />
          <div className="text-[13px] leading-relaxed">
            <p className="font-semibold text-white">
              You&apos;re booked for {formatWhen(justBooked.startTime)}.
            </p>
            <p className="text-caption">Calendly has emailed you the invite and the meeting link.</p>
          </div>
        </Tile>
      )}

      {configError ? (
        <TierCard accent="var(--line-strong)" ink="var(--foreground)" tag="Offline">
          <p className="text-[14px] text-caption">
            Couldn&apos;t load call pricing. Refresh to try again.
          </p>
        </TierCard>
      ) : !config ? (
        <TierCard accent="var(--line-strong)" ink="var(--foreground)" tag="Loading">
          <p className="flex items-center gap-2 text-[14px] text-caption">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading prices…
          </p>
        </TierCard>
      ) : awaitingTime ? (
        <TierCard accent="var(--positive)" tag="Paid · pick a time">
          <TierTitle>Choose your slot</TierTitle>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-caption">
            Payment received. This calendar link books one call — pick whatever time suits you and
            Calendly sends the invite.
          </p>
          <div className="mt-5">
            {awaitingTime.schedulingUrl ? (
              <CalendlyEmbed
                url={awaitingTime.schedulingUrl}
                bookingId={awaitingTime.id}
                campaign={awaitingTime.purpose}
                name={user?.username}
                email={user?.email}
                onScheduled={(uri) => void onScheduled(awaitingTime, uri)}
              />
            ) : (
              <div className="tile space-y-3 px-4 py-4">
                <p className="text-[13px] text-caption">
                  Your payment is in. The calendar link didn&apos;t come through from Calendly yet.
                </p>
                <Button variant="accent-outline" size="sm" onClick={() => void loadBookings()}>
                  Try again
                </Button>
              </div>
            )}
          </div>
          {scheduleError && (
            <Tile
              role="alert"
              className="mt-4 border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative"
            >
              {scheduleError}
            </Tile>
          )}
        </TierCard>
      ) : !config.available || offers.length === 0 ? (
        <TierCard accent="var(--line-strong)" ink="var(--foreground)" tag="Coming soon">
          <TierTitle>{copy.card(minutes)}</TierTitle>
          <p className="mt-3 text-[14px] text-caption">
            Calls aren&apos;t open for booking right now. Check back soon.
          </p>
        </TierCard>
      ) : (
        <div className="space-y-4">
          <div className={offers.length > 1 ? "grid gap-5 md:grid-cols-2" : "max-w-xl"}>
            {offers.map(({ price, token, style }) => {
              const usd = usdValue(prices, token, Number(price.amount));
              // A payment recovered after a reload has no card of its own, so any card retries it.
              const mine = payingWith === price.token.address || payingWith === null;
              const label = payment.busy && mine && payment.step !== "idle"
                ? CALL_STEP_LABEL[payment.step]
                : payment.unverified && mine
                  ? "Check my payment"
                  : signedIn
                    ? `Book with ${token.symbol}`
                    : "Connect wallet to book";
              return (
                <TierCard key={token.address} accent={style.accent} ink={style.ink} tag={style.tag}>
                  <div className="flex h-full flex-col">
                    <TierTitle>{copy.card(minutes)}</TierTitle>
                    <div className="mt-4 flex items-center gap-3">
                      <TokenMark token={token} size={40} className="h-10 w-10" />
                      <p className="display numeric text-[46px] text-white sm:text-[52px]">
                        {price.usd != null ? `$${price.usd.toLocaleString("en-US")}` : formatAmount(price.amount)}
                      </p>
                    </div>
                    <p className="mt-2 text-[13px] font-medium text-caption">
                      {price.usd != null ? (
                        <>
                          Paid in ${token.symbol} · ≈ {formatAmount(price.amount)} {token.symbol} at
                          today&apos;s price
                        </>
                      ) : (
                        <>
                          ${token.symbol} to the house wallet
                          {usd != null && !token.pegged && <> · ≈ {formatUsd(usd)}</>}
                        </>
                      )}
                    </p>
                    <p className="mt-4 flex-1 text-[15px] leading-relaxed text-white/75">
                      {copy.pitch} {style.note}
                    </p>
                    <TierButton
                      className="mt-6"
                      onClick={() => void onPay(price)}
                      disabled={payment.busy || (payment.unverified && !mine)}
                    >
                      {payment.busy && mine && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      )}
                      {label}
                    </TierButton>
                  </div>
                </TierCard>
              );
            })}
          </div>

          {payment.error && (
            <Tile
              role="alert"
              className="border-negative/30 bg-negative/10 px-4 py-3 text-[13px] text-negative"
            >
              {payment.error}
            </Tile>
          )}

          {config.recipient && (
            <p className="text-[12px] text-caption">
              Payments go straight to the house wallet{" "}
              <a
                href={`${robinhood.blockExplorers.default.url}/address/${config.recipient}`}
                target="_blank"
                rel="noreferrer"
                className="numeric text-primary-light underline-offset-2 hover:underline"
              >
                {shortAddress(config.recipient)}
              </a>{" "}
              on Robinhood Chain. Bill&apos;s calendar opens here once your payment confirms.
            </p>
          )}
        </div>
      )}

      {upcoming.length > 0 && (
        <TierCard accent="var(--primary-light)" tag="Booked">
          <TierTitle>Your upcoming calls</TierTitle>
          <ul className="mt-4 space-y-2">
            {upcoming.map((call) => (
              <li
                key={call.id}
                className="tile flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-white">
                    {call.startTime ? formatWhen(call.startTime) : "Time pending"}
                  </p>
                  <p className="text-[12px] text-caption">
                    {minutes} min with Bill · paid {formatAmount(call.amount)} {call.token.symbol}
                  </p>
                </div>
                <div className="flex gap-3 text-[12px] sm:ml-auto">
                  {call.rescheduleUrl && (
                    <a
                      href={call.rescheduleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary-light hover:underline"
                    >
                      Reschedule <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                  {call.cancelUrl && (
                    <a
                      href={call.cancelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-caption hover:text-white hover:underline"
                    >
                      Cancel <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </TierCard>
      )}
    </PageShell>
  );
}
