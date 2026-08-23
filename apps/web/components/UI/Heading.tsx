import { cn } from "@/lib/utils"

interface HeadingProps {
  children: React.ReactNode
  className?: string
  gradient?: boolean
  size?: "sm" | "md" | "lg" | "xl"
  /** Small uppercase eyebrow rendered above the heading. */
  kicker?: string
}

const sizeClasses = {
  sm: "text-lg lg:text-xl",
  md: "text-xl lg:text-2xl",
  lg: "text-2xl lg:text-3xl",
  xl: "text-3xl lg:text-4xl max-lg:text-2xl",
}

export default function Heading({
  children,
  className,
  gradient = true,
  size = "xl",
  kicker,
}: HeadingProps) {
  const heading = (
    <h1
      className={cn(
        "font-bold tracking-tight",
        sizeClasses[size],
        gradient ? "gradient-text" : "text-white",
        !kicker && className
      )}
    >
      {children}
    </h1>
  )

  if (!kicker) return heading

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="panel-label">{kicker}</span>
      {heading}
    </div>
  )
}
