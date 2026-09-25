"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, UserRound } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { fetchUnreadCount } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "./Sidebar";

/**
 * The signed-in-only nav rows: the private profile and messages. These sit
 * beside the admin link rather than in NAV_ITEMS because that list is the
 * public site map, rendered for signed-out visitors too.
 *
 * The unread badge polls rather than holding a socket open — the chat page owns
 * the live connection, and a badge does not justify a second one on every page.
 */
export function AccountNav({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const { user } = useSession();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }

    let active = true;
    const load = () => {
      void fetchUnreadCount().then((count) => active && setUnread(count));
    };
    load();
    const timer = setInterval(load, 60_000);

    return () => {
      active = false;
      clearInterval(timer);
    };
    // Re-reads on navigation so opening a thread clears the badge promptly.
  }, [user, pathname]);

  if (!user) return null;

  const items = [
    { href: "/profile", label: "Profile", Icon: UserRound, badge: 0 },
    { href: "/chat", label: "Messages", Icon: MessageSquare, badge: unread },
  ];

  return (
    <>
      {items.map(({ href, label, Icon, badge }) => {
        const active = isNavItemActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl eyebrow transition-colors",
              variant === "sidebar" ? "px-3.5 py-3" : "px-4 py-3.5",
              active
                ? "bg-primary/20 border border-primary/40 text-white"
                : "border border-transparent text-caption hover:text-white hover:bg-white/[0.04]",
            )}
          >
            <Icon
              className={cn(
                "shrink-0",
                variant === "sidebar" ? "w-[17px] h-[17px]" : "w-[18px] h-[18px]",
                active && "text-primary-light",
              )}
              aria-hidden="true"
            />
            <span className="truncate">{label}</span>
            {badge > 0 && (
              <span
                className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center"
                aria-label={`${badge} unread`}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
