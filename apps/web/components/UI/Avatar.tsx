"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { brandMarkDataUri } from "@/utils/brandMark";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  /** Shows the blue verified tick over the bottom-right corner. */
  verified?: boolean;
  /** `square` suits brand marks; `circle` (default) suits people. */
  shape?: "circle" | "square";
  /** Name the monogram is derived from. Defaults to `alt`. */
  fallbackSeed?: string;
  className?: string;
}

/**
 * Account image with a generated monogram fallback.
 *
 * Order of preference: the supplied `src`, then a monogram built from the
 * name. The monogram also covers the case where `src` is set but fails to
 * load, so a dead image URL never leaves an empty square in the layout.
 *
 * To show a real logo, put the file in `public/logos/` and set the account's
 * `pfp_url` to that path.
 */
export default function Avatar({
  src,
  alt,
  size = 32,
  verified = false,
  shape = "circle",
  fallbackSeed,
  className,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const seed = fallbackSeed || alt;
  const monogram = brandMarkDataUri(seed, shape === "circle");
  const resolved = !src || failed ? monogram : src;

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        unoptimized
        src={resolved}
        alt={alt}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cn(
          "object-cover w-full h-full border border-line-strong",
          shape === "circle" ? "rounded-full" : "rounded-lg"
        )}
      />
      {verified && (
        <BadgeCheck
          className="absolute -bottom-0.5 -right-0.5 text-primary fill-background"
          style={{ width: size * 0.42, height: size * 0.42 }}
          aria-label="Verified"
        />
      )}
    </span>
  );
}
