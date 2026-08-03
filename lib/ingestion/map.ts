import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { config, formatCompactCurrency, formatCurrency } from "@/lib/config";
import {
  EvidenceSnapshotSchema,
  type EvidenceItem,
  type EvidenceSnapshot,
  type MetricKey,
  type Period,
  type SourceOfTruth,
} from "@/lib/types";
import type {
  FreshnessWarning,
  MappedPeriod,
  TrackerRow,
  TrackerTab,
} from "@/lib/ingestion/types";

/* Daily tracker rows → weekly EvidenceSnapshot.

   Two governance rules are load-bearing here (AGENCY.md §1):
   1. Missing days are NEVER interpolated. The period narrows to actual
      coverage and a freshness warning is raised (the Birkenstock F3 pattern).
   2. A zero row is real data — a zero-spend day, not a gap.               */

const ing = config.ingestion;

/** Every metric the tracker carries, in display order. */
const TRACKER_METRICS = Object.values(ing.columnToMetric) as MetricKey[];

const METRIC_LABEL: Record<string, string> = {
  spend: "Spend",
  sales: "Sales",
  revenue: "Revenue",
  roas: "ROAS",
  cpa_cpo: "Cost per order",
  nc_roas: "NC ROAS",
  ncac: "NCAC",
  nvp: "NVP",
};

/** Which metrics are money, for formatting. */
const CURRENCY_METRICS = new Set<MetricKey>(["spend", "revenue", "cpa_cpo", "ncac"]);
const RATIO_METRICS = new Set<MetricKey>(["roas", "nc_roas"]);

const sum = (rows: TrackerRow[], metric: MetricKey): number =>
  rows.reduce((total, row) => total + (row.metrics[metric] ?? 0), 0);

const lastValue = (rows: TrackerRow[], metric: MetricKey): number | undefined => {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i].metrics[metric];
    if (v !== undefined) return v;
  }
  return undefined;
};

/** Ratio metrics recomputed from summed components — never the mean of daily
 *  ratios, which is mathematically wrong for a period rollup. */
function derive(rows: TrackerRow[], metric: MetricKey): number | undefined {
  const spend = sum(rows, "spend");
  if (metric === "roas") {
    const revenue = sum(rows, "revenue");
    return spend > 0 ? revenue / spend : undefined;
  }
  if (metric === "cpa_cpo") {
    // The tracker's "Sales" column maps to `conversions` (order count).
    const orders = sum(rows, "conversions");
    return orders > 0 ? spend / orders : undefined;
  }
  return undefined;
}

export function aggregate(
  rows: TrackerRow[],
  metric: MetricKey,
): number | undefined {
  if (rows.length === 0) return undefined;
  const method = ing.aggregation[metric] ?? "last";
  if (method === "sum") {
    const present = rows.some((r) => r.metrics[metric] !== undefined);
    return present ? sum(rows, metric) : undefined;
  }
  if (method === "derived") return derive(rows, metric);
  return lastValue(rows, metric);
}

function formatValue(metric: MetricKey, value: number): string {
  if (CURRENCY_METRICS.has(metric)) {
    return Math.abs(value) >= 10_000
      ? formatCompactCurrency(value)
      : formatCurrency(value);
  }
  if (RATIO_METRICS.has(metric)) return `${value.toFixed(2)}x`;
  // NVP is a percentage in the tracker — echo the source's own scale.
  if (metric === "nvp") return `${Math.round(value * 100) / 100}%`;
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

/** Days absent between the first and last row actually present. Interior gaps
 *  and a truncated tail are both reported; neither is ever filled in. */
export function findMissingDates(
  rows: TrackerRow[],
  expected?: Period,
): string[] {
  if (rows.length === 0) return [];
  const present = new Set(rows.map((r) => r.date));
  const start = parseISO(expected?.start ?? rows[0].date);
  const end = parseISO(expected?.end ?? rows[rows.length - 1].date);
  const missing: string[] = [];
  const span = differenceInCalendarDays(end, start);
  for (let i = 0; i <= span; i++) {
    const day = format(addDays(start, i), "yyyy-MM-dd");
    if (!present.has(day)) missing.push(day);
  }
  return missing;
}

function periodLabel(start: string, end: string, missing: string[]): string {
  const s = parseISO(start);
  const e = parseISO(end);
  const base =
    format(s, "MMM") === format(e, "MMM")
      ? `${format(s, "MMM d")}–${format(e, "d")}`
      : `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
  if (missing.length === 0) return base;
  const list = missing.map((d) => format(parseISO(d), "MMM d")).join(", ");
  return `${base} (${list} missing)`;
}

/** Deterministic snapshot id per (client, period): the client's own UUID with
 *  its final group replaced by a tracker marker (7) + YYMMDD + the client's
 *  discriminator. Re-ingesting the same week is therefore idempotent, and the
 *  id never collides with a seeded snapshot. */
export function snapshotIdFor(clientId: string, start: string): string {
  const groups = clientId.split("-");
  const yymmdd = start.replace(/-/g, "").slice(2); // 2026-07-06 → 260706
  const discriminator = groups[4].slice(-5); // keeps clients distinct
  return [groups[0], groups[1], groups[2], groups[3], `7${yymmdd}${discriminator}`].join("-");
}

export function mapPeriod(input: {
  tab: TrackerTab;
  clientId: string;
  requestedPeriod: Period;
  priorRows?: TrackerRow[];
}): MappedPeriod {
  const { tab, clientId, requestedPeriod, priorRows = [] } = input;

  const inRange = tab.rows.filter(
    (r) => r.date >= requestedPeriod.start && r.date <= requestedPeriod.end,
  );
  const missingDates = findMissingDates(inRange, requestedPeriod);

  // Coverage narrows to what actually exists — the period never claims days
  // the tracker doesn't have.
  const coveredStart = inRange[0]?.date ?? requestedPeriod.start;
  const coveredEnd = inRange[inRange.length - 1]?.date ?? requestedPeriod.end;

  const warnings: FreshnessWarning[] = [];
  if (inRange.length === 0) {
    warnings.push({
      tabName: tab.tabName,
      missingDates: [],
      message:
        `No tracker rows at all for ${requestedPeriod.start} → ${requestedPeriod.end}. ` +
        "Relay reports this as absent data, never as zero.",
    });
  } else if (missingDates.length > 0) {
    warnings.push({
      tabName: tab.tabName,
      missingDates,
      message:
        `Tracker rows missing for ${missingDates
          .map((d) => format(parseISO(d), "MMM d"))
          .join(", ")}. ` +
        "Per agency rules, Relay never interpolates missing days — narratives will exclude those dates and say so.",
    });
  }

  const asOf = `${coveredEnd}T23:59:00+04:00`;
  const snapshotId = snapshotIdFor(clientId, requestedPeriod.start);
  const sourceOfTruth: SourceOfTruth | undefined = tab.sourceOfTruth;

  const items: EvidenceItem[] = [];
  for (const metric of TRACKER_METRICS) {
    const value = aggregate(inRange, metric);
    if (value === undefined) continue;

    const prior = priorRows.length > 0 ? aggregate(priorRows, metric) : undefined;
    const deltaPct =
      prior !== undefined && prior !== 0
        ? Math.round(((value - prior) / Math.abs(prior)) * 1000) / 10
        : undefined;

    const method = ing.aggregation[metric] ?? "last";
    const methodNote =
      method === "sum"
        ? `Sum of ${inRange.length} daily rows`
        : method === "derived"
          ? "Recomputed from summed components"
          : "Closing daily value for the period";

    items.push({
      id: metric, // stable, readable key within a tracker-derived snapshot
      snapshotId,
      source: "Tracker",
      sourceOfTruth,
      metricKey: metric,
      metricLabel: METRIC_LABEL[metric] ?? metric,
      value,
      valueDisplay: formatValue(metric, value),
      deltaPct,
      deltaLabel:
        deltaPct === undefined
          ? "no prior period"
          : `${deltaPct > 0 ? "+" : ""}${deltaPct}% vs prior period`,
      polarity: config.deltaPolarity[metric] ?? "neutral",
      // The tracker is account-level only; Google Ads direct adds the split.
      segment: "overall",
      note: methodNote,
      series: inRange
        .map((r) => r.metrics[metric])
        .filter((v): v is number => v !== undefined),
    });
  }

  const snapshot: EvidenceSnapshot = EvidenceSnapshotSchema.parse({
    id: snapshotId,
    clientId,
    period: {
      start: coveredStart,
      end: coveredEnd,
      label: periodLabel(coveredStart, coveredEnd, missingDates),
    },
    asOf,
    items,
  });

  return { tabName: tab.tabName, snapshot, warnings };
}
