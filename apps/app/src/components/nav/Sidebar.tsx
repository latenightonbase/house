"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, SITE } from "@/lib/constants";
import { CreateListingButton } from "@/components/CreateListingButton";
import { useSession } from "@/components/SessionProvider";
import { isSuperadmin } from "@/lib/api";
import { cn } from "@/lib/utils";
import { NavIcon } from "./navIcons";
import { SocialRow } from "./SocialRow";
import { Wordmark } from "./Wordmark";
import { ConnectWalletButton } from "./ConnectWalletButton";

export function isNavItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Desktop rail: wordmark, tagline, the six sections, wallet, then socials. */
export function Sidebar() {
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[var(--sidebar-width)] z-50 flex-col bg-surface/60 border-r border-line">
      <div className="px-6 pt-7 pb-6 shrink-0 flex flex-col items-center">
        <Link href="/" aria-label={`${SITE.name} home`} className="block">
          <Wordmark />
        </Link>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-caption leading-snug text-nowrap">
          {SITE.tagline}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-none px-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-xl eyebrow transition-colors",
                active
                  ? "bg-primary/20 border border-primary/40 text-white"
                  : "border border-transparent text-caption hover:text-white hover:bg-white/[0.04]",
              )}
            >
              <NavIcon
                name={item.icon}
                className={cn("w-[17px] h-[17px] shrink-0", active && "text-primary-light")}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-5 shrink-0 space-y-4">
        {isSuperadmin(user) ? <CreateListingButton size="sm" className="w-full" /> : null}
        <ConnectWalletButton className="w-full" />
        <SocialRow className="pt-1" />
      </div>
    </aside>
  );
}
