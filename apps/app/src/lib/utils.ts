export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Dicebear blobs — used when no social avatar (seed is the wallet, or `"wallet"`). */
export function walletFallbackAvatar(seed?: string | null) {
  const normalized = seed?.trim() ? seed.trim().toLowerCase() : "wallet";
  return `https://api.dicebear.com/10.x/blobs/svg?seed=${encodeURIComponent(normalized)}`;
}

/**
 * Stand-in artwork for a listing with no poster: a Dicebear identicon in a few
 * muted tones (grey-violet, slate teal, umber) only a step off the near-black
 * tile, so it reads as texture rather than a picture. Seeded by the listing id,
 * so a listing keeps the same pattern everywhere it appears.
 */
export function listingFallbackArt(seed: string) {
  // The colour list's commas must stay literal — Dicebear answers 400 when they
  // arrive percent-encoded, which URLSearchParams always does.
  return `https://api.dicebear.com/10.x/glass/svg?seed=${encodeURIComponent(seed)}&backgroundColor=131117&rowColor=2a2733,263036,302c27&scale=60`;
}

/** Shortens to at most `max` characters, on a word break when one is near the end. */
export function clipText(text: string, max: number) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
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
