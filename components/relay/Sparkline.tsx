import { cn } from "@/lib/utils";

/* A hand-drawn 40px inline SVG sparkline (design.md §3 — NO charting library).
   Draws `series` as a single path; inherits color via currentColor. */

// Pure-visual geometry (not a product tunable) — kept local to the component.
const WIDTH = 96;
const HEIGHT = 40;
const PAD = 3;

export function Sparkline({
  series,
  invert = false,
  className,
}: {
  series: number[];
  /** For lower-is-better metrics: flip the y-axis so improvement reads upward. */
  invert?: boolean;
  className?: string;
}) {
  if (series.length < 2) return null;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const stepX = (WIDTH - PAD * 2) / (series.length - 1);

  const points = series.map((v, i) => {
    const x = PAD + i * stepX;
    const ratio = (v - min) / span;
    const y = PAD + (HEIGHT - PAD * 2) * (invert ? ratio : 1 - ratio);
    return [x, y] as const;
  });

  const d = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      fill="none"
      aria-hidden="true"
      className={cn("text-ink-soft", className)}
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={1.75} fill="currentColor" />
    </svg>
  );
}
