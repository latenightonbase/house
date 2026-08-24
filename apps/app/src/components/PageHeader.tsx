import type { ReactNode } from "react";

/** Shared page title block so every vertical opens the same way. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-caption max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
