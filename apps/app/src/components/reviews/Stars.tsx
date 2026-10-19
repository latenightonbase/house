"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5] as const;

/**
 * A read-only rating. Each star fills by the fraction of it the rating covers,
 * so a 4.5 shows half a fifth star rather than rounding to four or five.
 */
export function StarRating({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {STARS.map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-line-strong" style={{ width: size, height: size }} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star
                  className="fill-warning text-warning"
                  style={{ width: size, height: size }}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

const WORDS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

/** Five tappable stars, as a radio group so arrow keys move between them. */
export function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Rating"
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                onChange(Math.min(5, (value || 0) + 1));
              } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                onChange(Math.max(1, (value || 2) - 1));
              }
            }}
            className="rounded-md p-0.5 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-primary/50 enabled:hover:scale-110 disabled:opacity-50"
          >
            <Star
              className={cn(
                "h-7 w-7 transition-colors",
                star <= shown ? "fill-warning text-warning" : "text-line-strong",
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <span className="text-[12px] font-medium text-caption" aria-hidden="true">
        {WORDS[shown]}
      </span>
    </div>
  );
}
