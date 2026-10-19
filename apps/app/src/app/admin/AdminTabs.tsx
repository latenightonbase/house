"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/users", label: "Verification" },
];

/** Switches between the admin panels — the nav links only into the first. */
export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="inline-flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
      {SECTIONS.map((section) => {
        const active = pathname.startsWith(section.href);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
              active ? "bg-primary text-white" : "text-caption hover:bg-white/[0.04] hover:text-white",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
