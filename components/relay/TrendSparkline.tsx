"use client";

import { useId, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { KpiPolarity } from "@/lib/types";

/* ============================================================================
   TrendSparkline — the Numbers board's trend glyph. Hand-drawn SVG, no
   charting library (the tab's own doctrine): a monotone-cubic curve over the
   rolling window, a gradient wash under it, the KPI target as a dashed guide
   INSIDE the same domain, and a scrub that reads out any day on hover.

   MEANING IS CARRIED BY COLOUR, NOT BY FLIPPING THE AXIS. The old sparkline
   inverted lower-is-better series so "up reads good", which made the drawing
   disagree with the numbers beside it. Here the geometry is always true, and
   the line takes the delta system's tone instead: improving against the
   metric's polarity → Green/600, worsening → Red/600, flat or unjudged →
   Heading-06. Same language as the evidence cards' deltas.

   The target guide is part of the DOMAIN: min/max include the target, so
   "above or below the line" is honest — a series hugging its target renders
   hugging the dashes, never rescaled away from them.
   ========================================================================== */

export type TrendPoint = { date: string; value: number };

// Pure-visual geometry (not product tunables) — local to the component.
const W = 120;
const H = 44;
const PAD_X = 3;
const PAD_Y = 6;
/** A trend smaller than this share of the window mean reads as flat. */
const FLAT_BAND = 0.02;

/** Monotone cubic (Fritsch–Carlson) control points: smooth like a chart,
 *  never overshooting a daily spike the way Catmull-Rom does. */
function monotonePath(pts: readonly (readonly [number, number])[]): string {
  const n = pts.length;
  if (n === 2) {
    return `M${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]}`;
  }
  const dx = pts[1][0] - pts[0][0]; // uniform spacing
  const slopes: number[] = [];
  const secants: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    secants.push((pts[i + 1][1] - pts[i][1]) / dx);
  }
  slopes.push(secants[0]);
  for (let i = 1; i < n - 1; i++) {
    const a = secants[i - 1];
    const b = secants[i];
    slopes.push(a * b <= 0 ? 0 : (2 * a * b) / (a + b)); // harmonic mean
  }
  slopes.push(secants[n - 2]);

  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const c1x = x0 + dx / 3;
    const c1y = y0 + (slopes[i] * dx) / 3;
    const c2x = x1 - dx / 3;
    const c2y = y1 - (slopes[i + 1] * dx) / 3;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

export function TrendSparkline({
  points,
  polarity = "neutral",
  target,
  judgment,
  formatValue = (v) => String(v),
  className,
}: {
  /** Date-ascending, undefined days already dropped. */
  points: TrendPoint[];
  /** Judges the trend for the tone; "on_target" and neutral stay grey. */
  polarity?: KpiPolarity | "neutral";
  /** The KPI's (pro-rated) target — drawn as a dashed guide in-domain. */
  target?: number;
  /** ONE message per card (user-set): when the caller has judged standing
   *  against a target, the line wears THAT verdict — green on-track, red
   *  off — so the caption and the line always agree. Undefined falls back
   *  to the drift tone; the trend stays visible in the line's shape. */
  judgment?: boolean;
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const gradientId = useId();
  const reducedMotion = useReducedMotion();
  const [scrub, setScrub] = useState<number | null>(null);

  const geo = useMemo(() => {
    const values = points.map((p) => p.value);
    const domain = target === undefined ? values : [...values, target];
    const min = Math.min(...domain);
    const max = Math.max(...domain);
    const span = max - min || 1;
    const stepX = (W - PAD_X * 2) / (points.length - 1);
    const y = (v: number) => PAD_Y + (H - PAD_Y * 2) * (1 - (v - min) / span);
    const pts = points.map(
      (p, i) => [PAD_X + i * stepX, y(p.value)] as const,
    );
    const line = monotonePath(pts);
    const [lastX, lastY] = pts[pts.length - 1];
    const area = `${line} L${lastX.toFixed(1)} ${H - PAD_Y + 4} L${PAD_X} ${H - PAD_Y + 4} Z`;

    // The tone: back half of the window against the front half.
    const half = Math.floor(points.length / 2);
    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const front = mean(values.slice(0, half));
    const back = mean(values.slice(half));
    const base = Math.abs(mean(values)) || 1;
    const drift = (back - front) / base;
    let tone = "text-heading-06";
    if (judgment !== undefined) {
      tone = judgment ? "text-green-600" : "text-red-600";
    } else if (
      Math.abs(drift) >= FLAT_BAND &&
      (polarity === "higher_is_better" || polarity === "lower_is_better")
    ) {
      const improving =
        polarity === "higher_is_better" ? drift > 0 : drift < 0;
      tone = improving ? "text-green-600" : "text-red-600";
    }

    return {
      pts,
      line,
      area,
      lastX,
      lastY,
      stepX,
      tone,
      targetY: target === undefined ? null : y(target),
    };
  }, [points, target, polarity, judgment]);

  if (points.length < 2) return null;

  const scrubbed = scrub === null ? null : points[scrub];
  const scrubPt = scrub === null ? null : geo.pts[scrub];

  return (
    <div
      className={cn("relative shrink-0", geo.tone, className)}
      onPointerMove={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - box.left - PAD_X;
        const i = Math.round(x / geo.stepX);
        setScrub(Math.max(0, Math.min(points.length - 1, i)));
      }}
      onPointerLeave={() => setScrub(null)}
    >
      {/* The readout floats above the glyph, clamped to its width. */}
      {scrubbed && scrubPt && (
        <div
          className="pointer-events-none absolute bottom-full z-10 mb-1 flex -translate-x-1/2 items-center gap-1.5 rounded-6 border-fig border-border bg-surface-primary px-1.5 py-0.5 whitespace-nowrap shadow-popover"
          style={{
            left: Math.max(16, Math.min(W - 16, scrubPt[0])),
          }}
        >
          <span className="font-geist text-fig-caption-2 fig-sb text-heading-02">
            {formatValue(scrubbed.value)}
          </span>
          <span className="font-geist text-fig-caption-2 text-heading-06">
            {format(parseISO(scrubbed.date), "EEE, MMM d")}
          </span>
        </div>
      )}

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        fill="none"
        aria-hidden="true"
        className="block"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* The target guide — dashed, quiet, in the same domain. */}
        {geo.targetY !== null && (
          <line
            x1={PAD_X}
            y1={geo.targetY}
            x2={W - PAD_X}
            y2={geo.targetY}
            stroke="var(--color-grey-200)"
            strokeWidth={0.7}
            strokeDasharray="3 3"
          />
        )}

        <motion.path
          d={geo.area}
          fill={`url(#${gradientId})`}
          initial={reducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.45 }}
        />
        <motion.path
          d={geo.line}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reducedMotion ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />

        {/* Today: a resting dot, announced once by a soft ping. */}
        {!reducedMotion && (
          <motion.circle
            cx={geo.lastX}
            cy={geo.lastY}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.7}
            initial={{ r: 2, opacity: 0 }}
            whileInView={{ r: 7, opacity: [0, 0.5, 0] }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.9 }}
          />
        )}
        <circle cx={geo.lastX} cy={geo.lastY} r={2} fill="currentColor" />

        {/* The scrub: a hairline cursor and the day's own dot. */}
        {scrubPt && (
          <>
            <line
              x1={scrubPt[0]}
              y1={PAD_Y - 2}
              x2={scrubPt[0]}
              y2={H - PAD_Y + 4}
              stroke="var(--color-grey-200)"
              strokeWidth={0.7}
            />
            <circle
              cx={scrubPt[0]}
              cy={scrubPt[1]}
              r={2.5}
              fill="currentColor"
              stroke="var(--color-surface-primary)"
              strokeWidth={1}
            />
          </>
        )}
      </svg>
    </div>
  );
}
