"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { brandMarkDataUri } from "@/lib/brandMark";

type Props = {
  src?: string | null;
  alt: string;
  size?: number;
  verified?: boolean;
  /** `square` suits brand marks; `circle` (default) suits people. */
  shape?: "circle" | "square";
  fallbackSeed?: string;
  className?: string;
};

/**
 * Account image with a generated monogram fallback — used when `src` is
 * missing or fails to load, so a dead URL never leaves an empty box.
 */
export function BrandAvatar({
  src,
  alt,
  size = 32,
  verified = false,
  shape = "circle",
  fallbackSeed,
  className = "",
}: Props) {
  const [failed, setFailed] = useState(false);
  const monogram = brandMarkDataUri(fallbackSeed || alt, shape === "circle");
  const resolved = !src || failed ? monogram : src;

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt={alt}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cn(
          "object-cover w-full h-full border border-line-strong",
          shape === "circle" ? "rounded-full" : "rounded-lg",
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
