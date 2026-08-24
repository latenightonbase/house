import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}

export function Tile({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`tile ${className}`} {...props} />;
}

export function Pill({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`tile inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${className}`}
      {...props}
    />
  );
}
