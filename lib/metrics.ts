import { formatCompactCurrency, formatCurrency } from "@/lib/config";

/* ============================================================================
   One place that knows how each metric is NAMED and FORMATTED.

   This logic had started to fan out across the mapper, the morning band, the
   Numbers tab and the flag engine — and it drifted: flags were rendering
   revenue as a bare `26564` instead of `$26,564.00`. Single source now.
   ========================================================================== */

export type MetricShape = "currency" | "count" | "ratio" | "percent";

/** Display name per internal metric key. `conversions` and `sales` are the
 *  same thing under two vocabularies (Relay's and the tracker's). */
const LABELS: Record<string, string> = {
  spend: "Spend",
  sales: "Sales",
  conversions: "Sales",
  revenue: "Revenue",
  roas: "ROAS",
  cpa_cpo: "CPA/CPO",
  nc_roas: "NC ROAS",
  ncac: "NCAC",
  nvp: "NVP",
  aov: "AOV",
  cpc: "Avg CPC",
};

const SHAPES: Record<string, MetricShape> = {
  spend: "currency",
  revenue: "currency",
  cpa_cpo: "currency",
  ncac: "currency",
  aov: "currency",
  cpc: "currency",
  sales: "count",
  conversions: "count",
  roas: "ratio",
  nc_roas: "ratio",
  nvp: "percent",
};

export const metricLabel = (key: string): string => LABELS[key] ?? key;
export const metricShape = (key: string): MetricShape => SHAPES[key] ?? "count";

/** Percentage cells arrive at two different scales depending on the source:
 *  a human typing "76.15%" into a plain cell reads back as 76.15, but a cell
 *  FORMATTED as a percentage is stored by Sheets as the fraction 0.7615.
 *
 *  Relay keeps percentages on the human scale (76.15), because that's what the
 *  tracker displays and what targets are written against. A percent metric at
 *  or below 1 is therefore a fraction and is scaled up.
 *
 *  The assumption — that a genuine sub-1% value never appears — holds for the
 *  new-visitor share this applies to (it runs 48–80%). Revisit if a percent
 *  metric is ever added where values near zero are meaningful. */
export function normalizeMetricValue(key: string, value: number): number {
  if (metricShape(key) !== "percent") return value;
  if (value <= 0 || value > 1) return value;
  // Round after scaling: 0.7726 * 100 is 77.25999999999999 in binary floating
  // point, and that noise would otherwise be stored and re-displayed.
  return Math.round(value * 100 * 100) / 100;
}

/** Format a value the way this metric should read. `compact` switches large
 *  money to $39.8K for tight spaces (evidence cards); default is exact. */
export function formatMetric(
  key: string,
  value: number | undefined,
  options?: { compact?: boolean },
): string {
  if (value === undefined) return "—";
  switch (metricShape(key)) {
    case "currency":
      return options?.compact && Math.abs(value) >= 10_000
        ? formatCompactCurrency(value)
        : formatCurrency(value);
    case "ratio":
      return `${value.toFixed(2)}x`;
    case "percent":
      return `${Math.round(value * 100) / 100}%`;
    default:
      return new Intl.NumberFormat("en-US").format(Math.round(value));
  }
}
