import { Star } from "lucide-react";
import type { Rating } from "@/lib/ratings";
import { cn } from "@/lib/utils";

/**
 * The rating that sits beside a person's name wherever it appears — on
 * listings, bids, sales and in chat — so their track record travels with them.
 * Renders nothing for someone nobody has reviewed yet.
 *
 * Plain text, never a link: names often sit inside a card or row that is
 * itself the link or button.
 */
export function RatingBadge({
  rating,
  size = "sm",
  className,
}: {
  rating: Rating | null | undefined;
  size?: "xs" | "sm";
  className?: string;
}) {
  if (!rating || rating.count === 0) return null;
  const label = `Rated ${rating.average.toFixed(1)} out of 5 from ${rating.count} ${
    rating.count === 1 ? "review" : "reviews"
  }`;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "numeric inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap font-normal text-caption",
        size === "xs" ? "text-[10px]" : "text-[11px]",
        className,
      )}
    >
      <Star
        className={cn("fill-warning text-warning", size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3")}
        aria-hidden="true"
      />
      <span className="font-semibold text-white/90">{rating.average.toFixed(1)}</span>
      <span>({rating.count})</span>
    </span>
  );
}
