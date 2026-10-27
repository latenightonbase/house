"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CALL_HREF } from "@/lib/constants";
import { NavIcon } from "./navIcons";

/**
 * Pages where the pill would sit on top of something you are using — the call
 * page itself, the chat composer, and the create form's sticky submit bar.
 */
const HIDDEN_ON = [CALL_HREF, "/chat", "/listings/new"];

/**
 * "Book a call", floating in the bottom-right corner. On a phone it is a small
 * round icon above the tab bar; on a laptop it is a labelled pill.
 */
export function BookCallButton() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((href) => pathname.startsWith(href))) return null;

  return (
    <Link
      href={CALL_HREF}
      aria-label="Book a call"
      className="fixed right-4 bottom-[calc(var(--mobile-nav-offset)+1rem)] z-40 flex h-11 w-11 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-primary-bright to-secondary text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(139,92,246,0.55)] transition-transform hover:scale-[1.03] active:scale-95 lg:right-8 lg:bottom-8 lg:h-12 lg:w-auto lg:pl-4 lg:pr-5"
    >
      <NavIcon name="call" className="h-[17px] w-[17px] shrink-0" />
      <span className="max-lg:hidden">Book a call</span>
    </Link>
  );
}
