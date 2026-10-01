"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { isUnoptimizedSrc } from "@/lib/imageSrc";
import { cn } from "@/lib/utils";

/** The same bounds the uploader crops to, so a measured ratio never exceeds them. */
const MIN_ASPECT = 9 / 16;
const MAX_ASPECT = 16 / 9;

/**
 * A listing's poster. Sellers upload square and 9:16 artwork about equally, so
 * nothing here crops by default: the image is letterboxed inside its box over a
 * blurred, zoomed copy of itself, which fills the bars with the poster's own
 * colours instead of flat black. Any box shape therefore works — callers size
 * it with `className`.
 *
 * `fit="cover"` is for thumbnails, where a sliver of a tall poster would read
 * as nothing; there the box is simply filled.
 *
 * `adaptive` sizes the box to the poster's own ratio once it has loaded (square
 * until then). Pair it with a `max-h-*` so a 9:16 poster cannot run the page —
 * the bands that a capped height leaves on either side are the blurred fill.
 */
export function ListingPoster({
  src,
  alt,
  className,
  sizes = "(min-width: 768px) 480px, 100vw",
  fit = "contain",
  adaptive = false,
  priority = false,
  fallback = null,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  fit?: "contain" | "cover";
  adaptive?: boolean;
  priority?: boolean;
  /** Rendered instead when the image fails to load. */
  fallback?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    setFailed(false);
    setRatio(null);
  }, [src]);

  if (failed) return <>{fallback}</>;

  const unoptimized = isUnoptimizedSrc(src);

  return (
    // A span, so a poster can sit inside a row that is itself a button.
    <span
      className={cn("relative block overflow-hidden bg-surface-2", className)}
      style={adaptive ? { aspectRatio: ratio ?? 1 } : undefined}
    >
      {fit === "contain" && (
        <>
          <Image
            src={src}
            alt=""
            aria-hidden="true"
            fill
            sizes="64px"
            unoptimized={unoptimized}
            className="scale-125 object-cover opacity-60 blur-2xl"
          />
          <span className="absolute inset-0 bg-black/25" aria-hidden="true" />
        </>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        onError={() => setFailed(true)}
        onLoad={(event) => {
          if (!adaptive) return;
          const img = event.currentTarget;
          if (!img.naturalWidth || !img.naturalHeight) return;
          const natural = img.naturalWidth / img.naturalHeight;
          setRatio(Math.min(Math.max(natural, MIN_ASPECT), MAX_ASPECT));
        }}
        className={fit === "cover" ? "object-cover" : "object-contain"}
      />
    </span>
  );
}

/**
 * The small square a row leads with. A listing without a poster gets its
 * `placeholder` in the same box, so titles stay aligned down a mixed list.
 */
export function PosterThumb({
  src,
  alt,
  size = 40,
  placeholder,
  className,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  placeholder: ReactNode;
  className?: string;
}) {
  const box = cn(
    "shrink-0 overflow-hidden rounded-lg border border-line-strong",
    className,
  );
  const empty = (
    <span
      className="flex h-full w-full items-center justify-center bg-surface-2 text-caption"
      aria-hidden="true"
    >
      {placeholder}
    </span>
  );

  return (
    <span className={cn(box, "block")} style={{ width: size, height: size }}>
      {src ? (
        <ListingPoster
          src={src}
          alt={alt}
          fit="cover"
          sizes={`${size * 2}px`}
          className="h-full w-full"
          fallback={empty}
        />
      ) : (
        empty
      )}
    </span>
  );
}
