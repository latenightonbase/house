import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The masthead every non-home page opens with, so the eyebrow-over-display
 * rhythm of the billboard carries through the rest of the site.
 */
export function PageShell({
  eyebrow,
  title,
  /** Optional second word styled in the accent, matching the hero lockup. */
  titleAccent,
  intro,
  action,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  intro?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full space-y-6 pb-4", className)}>
      <header className="panel-glow p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end gap-5">
          <div className="min-w-0">
            <p className="eyebrow text-primary-bright">{eyebrow}</p>
            <h1 className="mt-3 display text-[clamp(1.875rem,5vw,3.25rem)] uppercase text-white">
              {title}
              {titleAccent && <span className="text-primary-bright"> {titleAccent}</span>}
            </h1>
            {intro && (
              <p className="mt-4 text-[15px] leading-relaxed text-caption max-w-2xl">{intro}</p>
            )}
          </div>
          {action && <div className="shrink-0 lg:ml-auto">{action}</div>}
        </div>
      </header>

      {children}
    </div>
  );
}

/** A titled block inside a page — the standard section container. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card p-5 sm:p-7", className)}>
      {(title || action) && (
        <header className="flex items-start gap-4 mb-5">
          <div className="min-w-0">
            {title && <h2 className="eyebrow text-primary-light">{title}</h2>}
            {description && (
              <p className="mt-2 text-[13px] text-caption leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {action && <div className="ml-auto shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * Marks a section whose copy the team still has to write. Explicit rather than
 * lorem ipsum, so an unfinished page never reads as a finished one.
 */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="tile border-dashed px-5 py-8 text-center">
      <p className="text-[13px] text-caption leading-relaxed max-w-md mx-auto">{children}</p>
    </div>
  );
}
