export type ButtonVariant = "primary" | "accent-outline" | "gradient";
export type ButtonSize = "sm" | "md";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  "accent-outline": "btn-accent-outline",
  gradient: "gradient-button text-white",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-10 px-5 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
) {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition touch-manipulation ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${className}`;
}
