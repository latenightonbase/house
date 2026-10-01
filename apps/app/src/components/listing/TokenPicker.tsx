"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import Image from "next/image";
import type { PaymentToken } from "@/lib/contracts/auctionHouse";
import { cn } from "@/lib/utils";

/**
 * The token choice, as one button per token rather than a dropdown — with two
 * options both should be visible at once. Behaves as a radio group: one tab
 * stop, arrow keys move the selection.
 */
export function TokenPicker({
  tokens,
  value,
  onChange,
  disabled,
  labelledBy,
  detail,
}: {
  tokens: PaymentToken[];
  value: string;
  onChange: (address: string) => void;
  disabled?: boolean;
  labelledBy?: string;
  /** A second line under each symbol — the create form shows the live USD price. */
  detail?: (token: PaymentToken) => ReactNode;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Math.max(
    0,
    tokens.findIndex((t) => t.address.toLowerCase() === value.toLowerCase()),
  );

  function onKeyDown(event: KeyboardEvent) {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (selected + delta + tokens.length) % tokens.length;
    onChange(tokens[next].address);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : "Token"}
      className="grid grid-cols-2 gap-2"
      onKeyDown={onKeyDown}
    >
      {tokens.map((t, index) => {
        const active = index === selected;
        return (
          <button
            key={t.address}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.address)}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
              detail ? "min-h-14 justify-start py-2.5 text-left" : "h-11",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:opacity-50",
              active
                ? "border-primary/60 bg-primary/20 text-white"
                : "border-line bg-surface-2 text-caption hover:border-line-strong hover:text-white",
            )}
          >
            <Image
              src={t.logo}
              alt=""
              width={detail ? 28 : 20}
              height={detail ? 28 : 20}
              className={cn("shrink-0 rounded-full", detail ? "h-7 w-7" : "h-5 w-5")}
            />
            {detail ? (
              <span className="min-w-0">
                <span className="block">{t.symbol}</span>
                <span className="numeric block truncate text-[11px] font-medium text-caption">
                  {detail(t)}
                </span>
              </span>
            ) : (
              t.symbol
            )}
          </button>
        );
      })}
    </div>
  );
}
