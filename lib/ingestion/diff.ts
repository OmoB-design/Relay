import { config } from "@/lib/config";
import type { EvidenceSnapshot, MetricKey } from "@/lib/types";

/* Dry-run differ: compare tracker-derived values against the snapshot Relay
   already holds for the same client and period. Proves the mapper before any
   source switch — a structural error shows up as a real gap, while penny
   rounding between a source's own figure and a recomputed one stays quiet. */

export type DiffRow = {
  metric: string;
  derived?: number;
  existing?: number;
  variancePct?: number;
  verdict: "match" | "within-tolerance" | "MISMATCH" | "new" | "absent";
};

const tolerance = config.ingestion.dryRunTolerancePct;

/** Existing items key on E1/G1/H1…; tracker items key on the metric itself.
 *  Match on metricKey, which both carry.
 *
 *  When several existing items share a metric they are a BREAKDOWN of it —
 *  Performance Max spend + Search spend are the account's total spend — so the
 *  comparable figure is their sum. Additive metrics only: summing a ratio
 *  (two ROAS figures) is meaningless, so those compare against the single
 *  item or nothing. */
const ADDITIVE = new Set<MetricKey>(["spend", "revenue", "conversions", "sales"]);

function existingValueFor(
  snapshot: EvidenceSnapshot | undefined,
  metric: MetricKey,
): number | undefined {
  const matches = (snapshot?.items ?? []).filter((i) => i.metricKey === metric);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0].value;
  if (ADDITIVE.has(metric)) {
    return matches.reduce((total, i) => total + i.value, 0);
  }
  return undefined; // ambiguous breakdown of a non-additive metric
}

export function diffSnapshot(
  derived: EvidenceSnapshot,
  existing: EvidenceSnapshot | undefined,
): DiffRow[] {
  const rows: DiffRow[] = [];

  for (const item of derived.items) {
    const metric = item.metricKey as MetricKey;
    const before = existingValueFor(existing, metric);

    if (before === undefined) {
      rows.push({ metric, derived: item.value, verdict: "new" });
      continue;
    }

    const variancePct =
      before === 0
        ? item.value === 0
          ? 0
          : Infinity
        : Math.abs((item.value - before) / before) * 100;

    rows.push({
      metric,
      derived: item.value,
      existing: before,
      variancePct,
      verdict:
        variancePct === 0
          ? "match"
          : variancePct <= tolerance
            ? "within-tolerance"
            : "MISMATCH",
    });
  }

  // Metrics the existing snapshot has that the tracker can't produce —
  // campaign/asset-group granularity lives in Google Ads, not the workbook.
  for (const item of existing?.items ?? []) {
    const metric = item.metricKey as MetricKey | undefined;
    if (!metric) continue;
    if (!derived.items.some((d) => d.metricKey === metric)) {
      rows.push({ metric, existing: item.value, verdict: "absent" });
    }
  }

  return rows;
}

export function diffPassed(rows: DiffRow[]): boolean {
  return !rows.some((r) => r.verdict === "MISMATCH");
}
