"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, UserRound } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { UnreadBadge, useChatNotifications } from "@/components/chat/ChatNotifications";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "./Sidebar";

/**
 * The signed-in-only nav rows: the private profile and messages. These sit
 * beside the admin link rather than in NAV_ITEMS because that list is the
 * public site map, rendered for signed-out visitors too.
 *
 * The unread count comes from ChatNotificationsProvider, which keeps it live
 * for every nav at once. The phone bar shows Messages as a tab of its own, so
 * its sheet passes `omitMessages`.
 */
export function AccountNav({
  variant = "sidebar",
  omitProfile = false,
  omitMessages = false,
}: {
  variant?: "sidebar" | "mobile";
  omitProfile?: boolean;
  omitMessages?: boolean;
}) {
  const { user } = useSession();
  const pathname = usePathname();
  const { unread } = useChatNotifications();

  if (!user) return null;

  const items = [
    ...(omitProfile ? [] : [{ href: "/profile", label: "Profile", Icon: UserRound, badge: 0 }]),
    ...(omitMessages
      ? []
      : [{ href: "/chat", label: "Messages", Icon: MessageSquare, badge: unread }]),
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
            <span className="relative shrink-0 flex">
              <Icon
                className={cn(
                  variant === "sidebar" ? "w-[17px] h-[17px]" : "w-[18px] h-[18px]",
                  active && "text-primary-light",
                )}
                aria-hidden="true"
              />
              <UnreadBadge count={badge} />
            </span>
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </>
  );
}
