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

/**
 * Full-bleed stand-in for the billboard when a winning project ships no
 * artwork. Unlike the monogram this has no corner radius and no letterbox —
 * it is stretched edge to edge behind the hero, so it paints a violet field
 * with the initials rather than a rounded tile.
 */
export function billboardPlaceholder(name: string): string {
  const initials = initialsFor(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#1a0b2e"/>
<stop offset="0.55" stop-color="#3b1a6b"/>
<stop offset="1" stop-color="#0a0410"/>
</linearGradient>
<radialGradient id="glow" cx="0.62" cy="0.42" r="0.5">
<stop offset="0" stop-color="#a855f7" stop-opacity="0.45"/>
<stop offset="1" stop-color="#a855f7" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="800" height="600" fill="url(#g)"/>
<rect width="800" height="600" fill="url(#glow)"/>
<rect x="250" y="180" width="300" height="240" rx="16" fill="none" stroke="#a855f7" stroke-opacity="0.5" stroke-width="3"/>
<text x="400" y="300" fill="#e9d5ff" font-family="Inter,system-ui,sans-serif" font-size="96" font-weight="800" letter-spacing="4" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
