import { format, parseISO } from "date-fns";
import { config } from "@/lib/config";
import { formatMetric, metricLabel } from "@/lib/metrics";
import type { ClientProfile, Kpi, MetricKey } from "@/lib/types";
import type { TrackerRow } from "@/lib/ingestion/types";

/* ============================================================================
   Flag detection (Phase 7.5a). This is step 7 of the agency's daily ritual —
   "scan the charts, flag anomalies to Sultan" — turned into thresholds that
   run at compile time instead of relying on human eyeballs.

   Three detectors, all thresholds from config, all per-metric polarity-aware:
     · target breach   — a KPI sits >X% the wrong side of its target
     · day swing       — a metric moves >Y% against its trailing average
     · sustained drift — N consecutive days moving the wrong way

   Every flag carries a stable dedupe key so the same condition doesn't
   re-raise every single morning.
   ========================================================================== */

const f = config.flags;

/* THE DEDUPE KEY IS DELIBERATELY DATE-FREE.
   `client:metric:detector` identifies a CONDITION, not an occurrence. A cost per
   order that sits above target for six days is one thing the buyer needs to know
   about, not six — it raises once, stays open while it holds, retracts when it
   stops, and re-opens if it comes back.

   It used to carry the date. Nothing caught it because the engine had only ever
   been run one day at a time; the first 14-day backfill produced 57 open flags
   for about a dozen real conditions. */
export type DetectedFlag = {
  clientId: string;
  metricKey: MetricKey;
  metricLabel: string;
  deltaLabel: string;
  headline: string;
  diagnostic: string;
  dedupeKey: string;
  createdAt: string;
};

type Direction = "higher_is_better" | "lower_is_better" | "neutral";

function polarityOf(metric: MetricKey): Direction {
  return (config.deltaPolarity[metric] ?? "neutral") as Direction;
}

/** Is `value` worse than `reference` for this metric? */
function isWorse(metric: MetricKey, value: number, reference: number): boolean {
  const p = polarityOf(metric);
  if (p === "neutral") return false;
  return p === "higher_is_better" ? value < reference : value > reference;
}

const pctDiff = (a: number, b: number): number =>
  b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100;

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((t, x) => t + x, 0) / xs.length;

/** Median, not mean, for the drift baseline — one spike day would otherwise
 *  drag the average up and make the return to normal look like a decline. */
const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Additive metrics (spend, orders, revenue) carry PERIOD-scoped targets —
 *  "weekly orders: 1,900" is a week's total, so judging one day against it
 *  reports a nonsense 86% miss. Rate metrics (CPO, ROAS, NCAC) are
 *  period-agnostic and compare directly. */
const isAdditive = (metric: MetricKey): boolean =>
  config.ingestion.aggregation[metric] === "sum";

const dailyTargetFor = (metric: MetricKey, target: number): number =>
  isAdditive(metric) ? target / config.flags.dailyTargetDivisor : target;

function valuesFor(rows: TrackerRow[], metric: MetricKey): { date: string; value: number }[] {
  return rows
    .map((r) => ({ date: r.date, value: r.metrics[metric] }))
    .filter((x): x is { date: string; value: number } => x.value !== undefined);
}

const pretty = (n: number) => Math.round(n * 100) / 100;
/** Percentages stay bare; metric VALUES carry their own units ($26,564.00). */
const val = (metric: MetricKey, n: number) => formatMetric(metric, n);
const day = (iso: string) => format(parseISO(iso), "MMM d");

/** Run all detectors for one client against its recent daily rows.
 *  `rows` must be date-ascending and end with the day being compiled. */
export function detectFlags(input: {
  client: ClientProfile;
  rows: TrackerRow[];
  onDate: string;
}): DetectedFlag[] {
  const { client, rows, onDate } = input;
  const found: DetectedFlag[] = [];
  const today = rows.find((r) => r.date === onDate);
  if (!today) return found;

  const kpisByMetric = new Map<MetricKey, Kpi>(
    client.kpis.map((k) => [k.mapsTo, k] as const),
  );

  // Which metrics to examine: everything the client has a KPI for, plus any
  // metric present today that carries a directional polarity.
  const candidates = Array.from(
    new Set<MetricKey>([
      ...Array.from(kpisByMetric.keys()),
      ...(Object.keys(today.metrics) as MetricKey[]),
    ]),
  );

  for (const metric of candidates) {
    const value: number | undefined = today.metrics[metric];
    if (value === undefined) continue;
    if (polarityOf(metric) === "neutral") continue;

    const kpi = kpisByMetric.get(metric);
    // The client's own word for it when they have one, else the display name —
    // never the raw key ("revenue" → "Revenue").
    const label = kpi?.label ?? metricLabel(metric);

    // 1. Target breach — only meaningful against a directional KPI target.
    if (kpi && kpi.polarity !== "on_target") {
      const dailyTarget = dailyTargetFor(metric, kpi.target);
      const off = Math.abs(pctDiff(value, dailyTarget));
      if (isWorse(metric, value, dailyTarget) && off > f.targetBreachPct) {
        found.push({
          clientId: client.id,
          metricKey: metric,
          metricLabel: label,
          deltaLabel: `${pretty(off)}% off target`,
          headline: `${label} is ${pretty(off)}% off target (${val(metric, value)} vs ${val(metric, dailyTarget)}).`,
          diagnostic:
            `Measured ${day(onDate)}. Target is ${val(metric, kpi.target)}` +
            (isAdditive(metric)
              ? ` for the period, so ${val(metric, dailyTarget)} for a single day`
              : "") +
            `; anything more than ${f.targetBreachPct}% the wrong side of it is flagged for a look.`,
          dedupeKey: `${client.id}:${metric}:target`,
          createdAt: `${onDate}T${String(config.daily.pullHour).padStart(2, "0")}:30:00+04:00`,
        });
      }
    }

    // 2. Day swing — against the trailing baseline, excluding today.
    const history = valuesFor(rows, metric).filter((v) => v.date < onDate);
    const baseline = history.slice(-f.swingBaselineDays).map((v) => v.value);
    if (baseline.length >= 3) {
      const avg = mean(baseline);
      const swing = pctDiff(value, avg);
      if (Math.abs(swing) > f.daySwingPct && isWorse(metric, value, avg)) {
        found.push({
          clientId: client.id,
          metricKey: metric,
          metricLabel: label,
          deltaLabel: `${swing > 0 ? "+" : ""}${pretty(swing)}% vs ${baseline.length}-day average`,
          headline: `${label} moved ${pretty(Math.abs(swing))}% against its recent average on ${day(onDate)}.`,
          diagnostic:
            `${val(metric, value)} vs a ${baseline.length}-day average of ${val(metric, avg)}. ` +
            `Single-day moves beyond ${f.daySwingPct}% are surfaced before a client notices.`,
          dedupeKey: `${client.id}:${metric}:swing`,
          createdAt: `${onDate}T${String(config.daily.pullHour).padStart(2, "0")}:30:00+04:00`,
        });
      }
    }

    // 3. Sustained drift — N consecutive days moving the wrong way.
    const recent = valuesFor(rows, metric).slice(-(f.sustainedDriftDays + 1));
    if (recent.length === f.sustainedDriftDays + 1) {
      let drifting = true;
      for (let i = 1; i < recent.length; i++) {
        if (!isWorse(metric, recent[i].value, recent[i - 1].value)) drifting = false;
      }
      // A monotonic slide only matters if it has actually taken the metric
      // somewhere worse than its normal range.
      const driftBaseline = history.slice(-f.swingBaselineDays).map((v) => v.value);
      const norm = median(driftBaseline);
      const offNorm = driftBaseline.length >= 3 ? pctDiff(value, norm) : 0;
      const material =
        driftBaseline.length >= 3 &&
        isWorse(metric, value, norm) &&
        Math.abs(offNorm) > f.sustainedDriftMinPct;

      if (drifting && material) {
        const from = recent[0];
        const move = pctDiff(value, from.value);
        found.push({
          clientId: client.id,
          metricKey: metric,
          metricLabel: label,
          deltaLabel: `${move > 0 ? "+" : ""}${pretty(move)}% over ${f.sustainedDriftDays} days`,
          headline: `${label} has drifted the wrong way ${f.sustainedDriftDays} days running (${val(metric, from.value)} → ${val(metric, value)}).`,
          diagnostic:
            `Consecutive daily moves against target from ${day(from.date)} to ${day(onDate)}, ` +
            `now ${pretty(Math.abs(offNorm))}% below its usual ${val(metric, norm)}. ` +
            "A steady drift is easier to miss than a spike — and cheaper to fix early.",
          dedupeKey: `${client.id}:${metric}:drift`,
          createdAt: `${onDate}T${String(config.daily.pullHour).padStart(2, "0")}:30:00+04:00`,
        });
      }
    }
  }

  return found;
}
