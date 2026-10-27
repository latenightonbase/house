import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The call page's card: a heavy accent outline with a tilted tag sitting on
 * the top edge, so each offer (and each step after paying) reads as its own
 * ticket. `accent` is any CSS colour; `ink` is the text colour that sits on it.
 */
export function TierCard({
  accent,
  ink = "#0b0710",
  tag,
  children,
  className,
}: {
  accent: string;
  ink?: string;
  tag: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      style={{ "--tier": accent, "--tier-ink": ink } as CSSProperties}
      className={cn(
        "relative mt-4 rounded-2xl border-2 border-[var(--tier)] bg-surface px-5 pb-5 pt-8 sm:px-7 sm:pb-7",
        "shadow-[0_0_40px_-18px_var(--tier)]",
        className,
      )}
    >
      <span className="absolute -top-3.5 left-5 -rotate-2 rounded-md bg-[var(--tier)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--tier-ink)] shadow-[0_2px_0_rgba(0,0,0,0.35)] sm:left-7">
        {tag}
      </span>
      {children}
    </section>
  );
}

/** The card's headline — uppercase and heavy, like the masthead. */
export function TierTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="display text-[22px] uppercase leading-tight text-white sm:text-[26px]">
      {children}
    </h2>
  );
}

/** A full-width action in the card's accent colour. */
export function TierButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--tier)] px-5 text-[15px] font-extrabold text-[var(--tier-ink)] transition",
        "touch-manipulation hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tier)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
