export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Calm relative label ("Ends in 3d") — no ticking clock, just a computed string. */
export function relativeEndLabel(endDateIso: string) {
  const ms = new Date(endDateIso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const hours = ms / 3_600_000;
  if (hours < 1) return `Ends in ${Math.max(1, Math.round(ms / 60_000))}m`;
  if (hours < 24) return `Ends in ${Math.round(hours)}h`;
  return `Ends in ${Math.round(hours / 24)}d`;
}
