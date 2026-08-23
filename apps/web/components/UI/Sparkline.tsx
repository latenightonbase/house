import { useId } from "react";

interface SparklineProps {
  /** Raw series. Scaled to fit; needs at least two points to render. */
  data: number[];
  width?: number;
  height?: number;
  /** Fills the area under the line with a fading gradient. */
  filled?: boolean;
  className?: string;
  strokeWidth?: number;
}

/**
 * Compact SVG line chart. Pure geometry — no chart library — so it stays
 * crisp at any size and costs nothing at runtime.
 */
export default function Sparkline({
  data,
  width = 120,
  height = 36,
  filled = true,
  className,
  strokeWidth = 1.75,
}: SparklineProps) {
  const gradientId = useId();

  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  // A flat series would divide by zero; fall back to a mid-height line.
  const span = max - min || 1;

  // Inset by the stroke so the line never clips at the edges.
  const pad = strokeWidth;
  const stepX = (width - pad * 2) / (data.length - 1);

  const points = data.map((value, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${pad},${height} ${line} ${width - pad},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {filled && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill={`url(#${gradientId})`} />
        </>
      )}
      <polyline
        points={line}
        fill="none"
        stroke="var(--primary-light)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
