"use client";

import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

/** Segmented pill tabs. Controlled — the parent owns the active value. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  size = "sm",
}: TabsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex gap-0.5 p-0.5 rounded-lg bg-surface-2 border border-line overflow-x-auto max-w-full",
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-md font-medium transition-colors whitespace-nowrap shrink-0",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
              active
                ? "bg-primary text-white"
                : "text-caption hover:text-white hover:bg-white/[0.04]",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
