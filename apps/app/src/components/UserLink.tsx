import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Where someone's public profile lives — by username, else account id. */
export function profileHref(handle: string) {
  return `/user/${encodeURIComponent(handle)}`;
}

/**
 * A person's name that opens their public profile. Used wherever a name is
 * shown, so any name on the site leads to the person behind it.
 *
 * `handle` is null for a wallet that never signed in — there is no profile to
 * open, so the name renders as plain text.
 *
 * `raised` lifts the link above a card's stretched button (see `ListingCard`):
 * those cards are one big control, and a link can't nest inside a button, so
 * the button is laid over the card and the name sits on top of it.
 */
export function UserLink({
  handle,
  children,
  className,
  raised = false,
}: {
  handle: string | null | undefined;
  children: ReactNode;
  className?: string;
  raised?: boolean;
}) {
  if (!handle) return <span className={className}>{children}</span>;
  return (
    <Link
      href={profileHref(handle)}
      className={cn(
        "transition-colors hover:text-primary-bright hover:underline underline-offset-2",
        raised && "relative z-[2]",
        className,
      )}
    >
      {children}
    </Link>
  );
}
