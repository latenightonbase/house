import { cn } from "@/lib/utils"

interface HeadingProps {
  children: React.ReactNode
  className?: string
  gradient?: boolean
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "text-xl lg:text-2xl",
  md: "text-2xl",
  lg: "text-2xl lg:text-3xl",
  xl: "text-3xl max-lg:text-2xl",
}

export default function Heading({ 
  children, 
  className, 
  gradient = true,
  size = "xl" 
}: HeadingProps) {
  return (
    <h1 
      className={cn(
        "font-bold",
        sizeClasses[size],
        gradient && "gradient-text",
        className
      )}
    >
      {children}
    </h1>
  )
}
