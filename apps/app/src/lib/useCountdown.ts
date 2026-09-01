"use client";

import { useEffect, useState } from "react";

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the target is in the past — the auction has closed. */
  ended: boolean;
  totalMs: number;
}

const ZERO: Countdown = { hours: 0, minutes: 0, seconds: 0, ended: true, totalMs: 0 };

function compute(targetMs: number): Countdown {
  const remaining = targetMs - Date.now();
  if (remaining <= 0) return ZERO;
  return {
    hours: Math.floor(remaining / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1000),
    ended: false,
    totalMs: remaining,
  };
}

/**
 * Ticks once a second toward an ISO deadline. Starts null and fills in after
 * mount so server and client markup match — the server has no "now".
 */
export function useCountdown(endDateIso?: string | null): Countdown | null {
  const [value, setValue] = useState<Countdown | null>(null);

  useEffect(() => {
    if (!endDateIso) {
      setValue(null);
      return;
    }
    const target = new Date(endDateIso).getTime();
    if (Number.isNaN(target)) {
      setValue(null);
      return;
    }

    setValue(compute(target));
    const id = setInterval(() => setValue(compute(target)), 1000);
    return () => clearInterval(id);
  }, [endDateIso]);

  return value;
}
