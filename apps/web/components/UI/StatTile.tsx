import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Secondary line under the value — a USD equivalent, a count, a date. */
  sub?: ReactNode;
  /** Tints the value. `positive` is used for engagement/growth figures. */
  tone?: "default" | "positive" | "warning" | "accent";
  /** `bare` drops the tile chrome, for use inside an already-bordered strip. */
  variant?: "tile" | "bare";
  className?: string;
}

const toneClass = {
  default: "text-white",
  positive: "text-positive",
  warning: "text-warning",
  accent: "text-primary-light",
} as const;

/**
 * A single labelled figure. The dashboard's smallest data unit — used in the
 * topbar strip, the featured panel, and inside auction cards.
 */
export default function StatTile({
  label,
  value,
  sub,
  tone = "default",
  variant = "tile",
  className,
}: StatTileProps) {
  return (
    <div className={cn(variant === "tile" && "tile px-3 py-2.5", className)} data-stat={label}>
      <p className="panel-label mb-1.5">{label}</p>
      <p className={cn("font-bold text-[15px] leading-none numeric", toneClass[tone])}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-caption mt-1 leading-none">{sub}</p>}
    </div>
  );
}
