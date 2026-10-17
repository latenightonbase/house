"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Ellipsis, MessageSquare, Plus, ShieldCheck } from "lucide-react";
import { FOOTER_LINKS, NAV_ITEMS, SITE } from "@/lib/constants";
import { useOpenConnect } from "@/components/connect-intent";
import { useSession } from "@/components/SessionProvider";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { isSuperadmin } from "@/lib/api";
import { cn } from "@/lib/utils";
import { NavIcon } from "./navIcons";
import { SocialRow } from "./SocialRow";
import { Wordmark } from "./Wordmark";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { isNavItemActive } from "./Sidebar";
import { AccountNav } from "./AccountNav";
import { UnreadBadge, useChatNotifications } from "@/components/chat/ChatNotifications";

/** The two sections that earn a tab of their own; the rest of NAV_ITEMS lives under More. */
const TAB_HREFS = ["/", "/marketplace"];
const TAB_LABELS: Record<string, string> = { "/": "Home", "/marketplace": "Market" };
const CREATE_HREF = "/listings/new";
const CHAT_HREF = "/chat";

/**
 * Phone header plus a bottom tab bar: two primary sections, a raised Create
 * button in the middle, Chat (always present, carrying the live unread
 * count), then More — a bottom sheet with Profile and the rest of the site map
 * in the same order the desktop rail shows it.
 */
export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status } = useSession();
  const openConnect = useOpenConnect();
  const { unread } = useChatNotifications();
  const [moreOpen, setMoreOpen] = useState(false);

  // Route changes close the sheet; without this a tap navigates behind it.
  useEffect(() => setMoreOpen(false), [pathname]);

  const tabs = NAV_ITEMS.filter((item) => TAB_HREFS.includes(item.href));
  const overflow = NAV_ITEMS.filter((item) => !TAB_HREFS.includes(item.href));
  const signedIn = status === "authenticated";

  const moreActive =
    overflow.some((item) => !item.external && isNavItemActive(pathname, item.href)) ||
    isNavItemActive(pathname, "/profile") ||
    isNavItemActive(pathname, "/admin");

  const chatIcon = (
    <span className="relative flex">
      <MessageSquare className="w-5 h-5" aria-hidden="true" />
      <UnreadBadge count={unread} />
    </span>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-b border-line pt-[var(--safe-top)]">
        <div className="h-14 flex items-center justify-between gap-2 px-4">
          <Link href="/" aria-label={`${SITE.name} home`} className="min-w-0">
            <Wordmark size="sm" />
          </Link>
          <ConnectWalletButton size="sm" showIcon={false} />
        </div>
      </header>

      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-t border-line pb-[var(--safe-bottom)]"
      >
        <div className="h-16 grid grid-cols-5 items-stretch px-1">
          {tabs.map((item) => (
            <TabLink
              key={item.href}
              href={item.href}
              label={TAB_LABELS[item.href] ?? item.label}
              active={isNavItemActive(pathname, item.href)}
              icon={<NavIcon name={item.icon} className="w-5 h-5" />}
            />
          ))}

          <div className="flex items-start justify-center">
            <button
              type="button"
              aria-label="Create listing"
              aria-current={isNavItemActive(pathname, CREATE_HREF) ? "page" : undefined}
              onClick={() => (signedIn ? router.push(CREATE_HREF) : openConnect())}
              className="-mt-5 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary-bright to-secondary text-white ring-4 ring-background shadow-[0_8px_24px_rgba(139,92,246,0.55)] transition-transform active:scale-95"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          {signedIn ? (
            <TabLink
              href={CHAT_HREF}
              label="Chat"
              active={isNavItemActive(pathname, CHAT_HREF)}
              icon={chatIcon}
            />
          ) : (
            <TabButton label="Chat" onClick={openConnect} icon={chatIcon} />
          )}

          <TabButton
            label="More"
            active={moreActive || moreOpen}
            expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
            icon={<Ellipsis className="w-5 h-5" aria-hidden="true" />}
          />
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="lg:hidden">
          <DrawerTitle className="sr-only">More</DrawerTitle>
          <div className="overflow-y-auto px-4 pt-4 pb-[calc(1.5rem+var(--safe-bottom))] space-y-6">
            <div className="space-y-1.5">
              {overflow.map((item) => {
                const active = !item.external && isNavItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl eyebrow transition-colors",
                      active
                        ? "bg-primary/20 border border-primary/40 text-white"
                        : "border border-transparent text-caption",
                    )}
                  >
                    <NavIcon name={item.icon} className="w-[18px] h-[18px] shrink-0" />
                    {item.label}
                    {item.external ? (
                      <ArrowUpRight className="ml-auto w-[15px] h-[15px] shrink-0 opacity-60" aria-hidden="true" />
                    ) : null}
                  </Link>
                );
              })}

              <AccountNav variant="mobile" omitMessages />

              {isSuperadmin(user) ? (
                <Link
                  href="/admin/listings"
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl eyebrow transition-colors",
                    isNavItemActive(pathname, "/admin")
                      ? "bg-primary/20 border border-primary/40 text-white"
                      : "border border-transparent text-caption",
                  )}
                >
                  <ShieldCheck className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                  Admin
                </Link>
              ) : null}
            </div>

            <SocialRow />

            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-4 border-t border-line text-[11px] text-caption">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

const tabClass = (active: boolean) =>
  cn(
    "flex flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
    active ? "text-white" : "text-caption",
  );

function TabLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
      <TabIcon active={active}>{icon}</TabIcon>
      {label}
    </Link>
  );
}

function TabButton({
  label,
  icon,
  onClick,
  active = false,
  expanded,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-haspopup={expanded === undefined ? undefined : "dialog"}
      className={tabClass(active)}
    >
      <TabIcon active={active}>{icon}</TabIcon>
      {label}
    </button>
  );
}

function TabIcon({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span className={cn("flex items-center justify-center", active && "text-primary-light")}>
      {children}
    </span>
  );
}
