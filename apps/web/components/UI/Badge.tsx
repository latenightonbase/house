import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "positive" | "warning" | "negative";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  /** `solid` reads as a status stamp; `soft` (default) as an inline tag. */
  variant?: "soft" | "solid";
}

const soft: Record<BadgeTone, string> = {
  neutral: "bg-white/[0.04] border-line-strong text-caption",
  accent: "bg-primary/12 border-primary/40 text-primary-light",
  positive: "bg-positive/10 border-positive/30 text-positive",
  warning: "bg-warning/10 border-warning/30 text-warning",
  negative: "bg-negative/10 border-negative/30 text-negative",
};

const solid: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 border-line text-foreground",
  accent: "bg-primary border-primary text-white",
  positive: "bg-positive/15 border-positive/40 text-positive",
  warning: "bg-warning/15 border-warning/40 text-warning",
  negative: "bg-negative/15 border-negative/40 text-negative",
};

/** Small status pill — bot/human tags, CONFIRMED stamps, countdown chips. */
export default function Badge({
  children,
  tone = "neutral",
  icon,
  className,
  variant = "soft",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap",
        variant === "soft" ? soft[tone] : solid[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
