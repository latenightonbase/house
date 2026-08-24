"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CountdownProps {
  /** ISO timestamp the auction closes at. */
  endDate: string;
  className?: string;
  /** Below this many hours remaining, the clock turns amber. */
  urgentBelowHours?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "Ended";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Live HH:MM:SS countdown. Renders a stable placeholder on the server and
 * starts ticking after mount so server/client markup agree on first paint.
 */
export function Countdown({ endDate, className, urgentBelowHours = 3 }: CountdownProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endDate).getTime();
    const tick = () => setRemaining(target - Date.now());

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  if (remaining === null) {
    return <span className={cn("numeric", className)}>--:--:--</span>;
  }

  const urgent = remaining > 0 && remaining < urgentBelowHours * 3_600_000;

  return (
    <span className={cn("numeric font-semibold", urgent && "text-warning", className)}>
      {formatRemaining(remaining)}
    </span>
  );
}
