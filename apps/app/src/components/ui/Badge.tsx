import type { HTMLAttributes } from "react";

export type BadgeVariant = "neutral" | "accent" | "positive" | "negative" | "warning";

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "neutral", className = "", ...props }: Props) {
  return <span className={`badge badge-${variant} ${className}`} {...props} />;
}
