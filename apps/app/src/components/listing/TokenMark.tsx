import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A token's logo, or its first letter on a plain disc when it has none — a
 * token pasted by address brings no artwork with it.
 */
export function TokenMark({
  token,
  size,
  className,
}: {
  token: { symbol: string; logo?: string };
  size: number;
  className?: string;
}) {
  if (token.logo) {
    return (
      <Image
        src={token.logo}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-line-strong bg-surface-2 font-bold text-white",
        className,
      )}
    >
      {token.symbol.slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
