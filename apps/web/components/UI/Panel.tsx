import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  children: ReactNode;
  className?: string;
  /** Body padding. Use `false` for flush content like tables. */
  padded?: boolean;
}

/**
 * The standard dashboard surface. Everything on the dashboard sits in one of
 * these so elevation and border treatment stay identical across the page.
 */
export function Panel({ children, className, padded = true }: PanelProps) {
  return (
    <section className={cn("card overflow-hidden", padded && "p-4", className)}>
      {children}
    </section>
  );
}

interface PanelHeaderProps {
  /** Small uppercase eyebrow, optionally preceded by an icon. */
  label: string;
  icon?: ReactNode;
  /** Right-aligned control — a "View all" link, tabs, or a button. */
  action?: ReactNode;
  className?: string;
}

/**
 * Panel header in the reference's style: a micro uppercase label on the left
 * and an optional action on the right.
 */
export function PanelHeader({ label, icon, action, className }: PanelHeaderProps) {
  return (
    <header className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-caption shrink-0">{icon}</span>}
        {/* Wraps rather than truncates — these labels are the only thing
            naming the panel, so losing their tail is worse than two lines. */}
        <span className="panel-label leading-tight">{label}</span>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/** "View all →" affordance used in several panel headers. */
export function ViewAllLink({
  onClick,
  label = "View all",
}: {
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium text-caption hover:text-white transition-colors flex items-center gap-1"
    >
      {label}
      <span aria-hidden="true">→</span>
    </button>
  );
}
