"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-lg bg-surface-2 border border-line text-base sm:text-sm text-foreground placeholder:text-caption outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-50";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

/** Label + control + one line of help or error, so every form row reads alike. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-center gap-2 panel-label">
        {label}
        {optional && <span className="normal-case tracking-normal font-normal">optional</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] text-negative">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-caption">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "h-11 px-3", className)} {...props} />;
}

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "px-3 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL, "h-11 px-3 appearance-none", className)} {...props} />;
}

/** Prefix/suffix wrapper for amount inputs — "$" in front, token symbol behind. */
export function InputAddon({
  prefix,
  suffix,
  children,
}: {
  prefix?: ReactNode;
  suffix?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-caption pointer-events-none">
          {prefix}
        </span>
      )}
      {children}
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-caption pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
