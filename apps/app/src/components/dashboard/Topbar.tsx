"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { CreateListingButton } from "@/components/CreateListingButton";

/** Desktop topbar: search only — the viewer lives in the sidebar wallet button. */
export function Topbar() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="max-lg:hidden flex items-center gap-4 mb-6">
      <form onSubmit={(e) => e.preventDefault()} className="relative flex-1 max-w-[420px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-caption pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creators..."
          aria-label="Search"
          className="w-full h-11 pl-9 pr-14 rounded-xl bg-surface border border-line text-sm text-foreground placeholder:text-caption outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-caption pointer-events-none">
          ⌘K
        </kbd>
      </form>

      <CreateListingButton size="sm" className="shrink-0 ml-auto" />
    </div>
  );
}
