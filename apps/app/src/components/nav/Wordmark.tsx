import { cn } from "@/lib/utils";

/**
 * The Late Night Onchain lockup: a white brush-script "LATE NIGHT" over a
 * violet "ONCHAIN". Rendered as type rather than an image so it stays crisp at
 * every size and inherits the theme's accent.
 */
export function Wordmark({
  size = "lg",
  className,
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  const compact = size === "sm";
  return (
    <span
      className={cn("flex flex-col items-center leading-none select-none", className)}
      aria-label="Late Night Onchain"
    >
      <span
        className={cn(
          "font-display text-white text-center w-full flex justify-center items-center",
          compact ? "text-[15px]" : "text-[26px]",
        )}
        style={{ letterSpacing: compact ? "0.01em" : "0.005em" }}
      >
        LATE NIGHT
      </span>
      <span
        className={cn(
          "font-display text-primary-bright",
          compact ? "text-[11px] mt-0.5" : "text-[19px] mt-1",
        )}
      >
        ONCHAIN
      </span>
    </span>
  );
}

/** The stacked footer mark: solid "LNOC" over its expansion. */
export function FooterMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="text-white font-extrabold text-[22px] tracking-[0.02em]">LNOC</span>
      <span className="text-[7.5px] font-semibold uppercase tracking-[0.18em] text-caption mt-1">
        Late Night Onchain
      </span>
    </span>
  );
}
