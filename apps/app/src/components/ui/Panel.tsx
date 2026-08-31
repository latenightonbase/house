import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  children: ReactNode;
  className?: string;
  /** Body padding. Use `false` for flush content like tables. */
  padded?: boolean;
}

/** The standard dashboard surface — everything on the dashboard sits in one. */
export function Panel({ children, className, padded = true }: PanelProps) {
  return (
    <section className={cn("card overflow-hidden", padded && "p-4", className)}>
      {children}
    </section>
  );
}

interface PanelHeaderProps {
  label: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PanelHeader({ label, icon, action, className }: PanelHeaderProps) {
  return (
    <header className={cn("flex items-center justify-between gap-3 flex-wrap", className)}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-caption shrink-0">{icon}</span>}
        <span className="panel-label leading-tight">{label}</span>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function ViewAllLink({
  onClick,
  label = "View all",
}: {
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-caption hover:text-white transition-colors flex items-center gap-1"
    >
      {label}
      <span aria-hidden="true">→</span>
    </button>
  );
}
