"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { FOOTER_LINKS, NAV_ITEMS, SITE } from "@/lib/constants";
import { CreateListingButton } from "@/components/CreateListingButton";
import { useSession } from "@/components/SessionProvider";
import { isSuperadmin } from "@/lib/api";
import { cn } from "@/lib/utils";
import { NavIcon } from "./navIcons";
import { SocialRow } from "./SocialRow";
import { Wordmark } from "./Wordmark";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { isNavItemActive } from "./Sidebar";

/**
 * Phone header plus a full-height drawer. The six sections do not fit a bottom
 * tab bar at this tracking, so the drawer carries the whole map — the same list
 * the desktop rail shows, in the same order.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { user } = useSession();
  const [open, setOpen] = useState(false);

  // Route changes close the drawer; without this a tap navigates behind it.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* z-50 keeps this above the drawer (z-40) so the close button stays tappable. */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-b border-line pt-[var(--safe-top)]">
        <div className="h-14 flex items-center justify-between gap-2 px-4">
          <Link href="/" aria-label={`${SITE.name} home`} className="min-w-0">
            <Wordmark size="sm" />
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <ConnectWalletButton size="sm" showIcon={false} />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-lg border transition-colors",
                open
                  ? "bg-primary/20 border-primary/50 text-white"
                  : "border-line text-caption",
              )}
            >
              {open ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-40 lg:hidden bg-background/95 backdrop-blur-md pt-[var(--mobile-header-offset)] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          // Tapping the empty space beside or below the menu dismisses it.
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="px-4 py-6 space-y-6">
            <nav className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl eyebrow transition-colors",
                      active
                        ? "bg-primary/20 border border-primary/40 text-white"
                        : "border border-transparent text-caption",
                    )}
                  >
                    <NavIcon name={item.icon} className="w-[18px] h-[18px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {isSuperadmin(user) ? <CreateListingButton className="w-full" /> : null}

            <SocialRow />

            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 border-t border-line text-[11px] text-caption">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="pt-4 hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>

            {/* The X sits at the top of a full-height drawer; this is the reachable one. */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl border border-line text-caption eyebrow hover:text-white hover:border-primary/50 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              Close menu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
