import type { HTMLAttributes } from "react";

export function PanelLabel({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`panel-label ${className}`} {...props} />;
}
