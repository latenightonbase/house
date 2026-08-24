/**
 * Generates a stable monogram (initials + colour) for a creator or brand, so
 * a missing or broken avatar image never leaves a hole in the layout.
 */

const MARK_COLORS = [
  { bg: "#1e3a8a", fg: "#bfd0ff" },
  { bg: "#134e4a", fg: "#99f6e4" },
  { bg: "#3f2d63", fg: "#d8c7ff" },
  { bg: "#164e3b", fg: "#a7f3d0" },
  { bg: "#4c1d3d", fg: "#f9c8e4" },
  { bg: "#3b3054", fg: "#cfc2f0" },
  { bg: "#1e3a5f", fg: "#b9d9ff" },
  { bg: "#4a3218", fg: "#f5d5a8" },
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function initialsFor(name: string): string {
  const cleaned = name.replace(/^@/, "").trim();
  if (!cleaned) return "?";

  const words = cleaned.split(/[\s\-_]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function colorsFor(name: string) {
  return MARK_COLORS[hash(name) % MARK_COLORS.length];
}

/** Inline SVG data URI so the monogram paints immediately, no network request. */
export function brandMarkDataUri(name: string, rounded = false): string {
  const { bg, fg } = colorsFor(name);
  const initials = initialsFor(name);
  const radius = rounded ? 50 : 22;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="${radius}" fill="${bg}"/>
<text x="50" y="50" fill="${fg}" font-family="Inter,system-ui,sans-serif" font-size="38" font-weight="700" letter-spacing="1" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
