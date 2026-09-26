"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { isUnoptimizedSrc } from "@/lib/imageSrc";
import { walletFallbackAvatar } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt?: string;
  /** Last resort, shown only when there is nothing to seed a picture with. */
  fallback: string;
  /**
   * Wallet (or any stable id) behind the generated blob used everywhere else
   * when someone has no uploaded picture. Without it the initials still show.
   */
  fallbackSeed?: string | null;
  size?: number;
  className?: string;
};

/**
 * Account picture, in the order the rest of the app resolves one: the uploaded
 * image, then a blob generated from the wallet, then initials. Each step is
 * also the recovery for the one before it — an avatar whose URL has rotted
 * falls through to the blob rather than leaving a broken image.
 */
export function Avatar({
  src,
  alt = "",
  fallback,
  fallbackSeed,
  size = 44,
  className = "",
}: Props) {
  const seeded = fallbackSeed?.trim() ? walletFallbackAvatar(fallbackSeed) : null;
  const sources = [src, seeded].filter(Boolean) as string[];

  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
  }, [src, seeded]);

  const current = sources[step];

  if (current) {
    return (
      <Image
        key={current}
        src={current}
        alt={alt}
        width={size}
        height={size}
        unoptimized={isUnoptimizedSrc(current)}
        onError={() => setStep((previous) => previous + 1)}
        className={`rounded-full object-cover border border-line-strong ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`flex items-center justify-center rounded-full border border-line-strong bg-surface-2 text-caption ${className}`}
    >
      {fallback}
    </div>
  );
}
