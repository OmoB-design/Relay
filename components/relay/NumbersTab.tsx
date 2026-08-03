"use client";

import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { config, formatCurrency } from "@/lib/config";
import type { ClientProfile, DailyMetrics, DailyRow, MetricSegment } from "@/lib/types";
import { Sparkline } from "@/components/relay/Sparkline";
import { EmptyState } from "@/components/relay/EmptyState";

/* Numbers tab (Phase 7.5a) — the replacement for the chart-scan step of the
   agency's daily ritual (AGENCY.md §1, steps 6–7).

   Deliberately NOT a dashboard: per client only, never a cross-client
   aggregate, no charting library, and every number carries its source. It's an
   evidence board — a place to notice something and go say it, not a place to
   sit and watch.                                                            */

type MetricKey = keyof DailyMetrics;

const METRICS: {
  key: MetricKey;
  label: string;
  kind: "money" | "count" | "ratio" | "percent";
}[] = [
  { key: "spend", label: "Spend", kind: "money" },
  { key: "sales", label: "Sales", kind: "count" },
  { key: "revenue", label: "Revenue", kind: "money" },
  { key: "roas", label: "ROAS", kind: "ratio" },
  { key: "cpa_cpo", label: "CPA/CPO", kind: "money" },
  { key: "nc_roas", label: "NC ROAS", kind: "ratio" },
  { key: "ncac", label: "NCAC", kind: "money" },
  { key: "nvp", label: "NVP", kind: "percent" },
];

const SEGMENT_LABEL: Record<MetricSegment, string> = {
  overall: "Overall",
  branded: "Branded",
  non_branded: "Non-branded",
};

function display(kind: string, value: number | undefined): string {
  if (value === undefined) return "—";
  if (kind === "money") return formatCurrency(value);
  if (kind === "ratio") return `${value.toFixed(2)}x`;
  if (kind === "percent") return `${Math.round(value * 100) / 100}%`;
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

/** DailyMetrics calls the order count `sales`; internally it's `conversions`.
 *  Normalize before looking anything up by metric key. */
const internalKey = (metric: MetricKey): string =>
  metric === "sales" ? "conversions" : metric;

const isAdditive = (metric: MetricKey): boolean =>
  config.ingestion.aggregation[internalKey(metric)] === "sum";

/** Additive metrics carry PERIOD-scoped targets ("weekly orders: 1,900"), so a
 *  single day is judged against the pro-rated share — otherwise every day
 *  reports a nonsense miss. Same rule the flag engine applies. */
function dailyTarget(metric: MetricKey, target: number): number {
  return isAdditive(metric) ? target / config.flags.dailyTargetDivisor : target;
}

export function NumbersTab({
  profile,
  rows,
}: {
  profile: ClientProfile;
  rows: DailyRow[]; // date-ascending
}) {
  const windowDays = config.daily.numbersWindowDays;

  if (rows.length === 0) {
    return (
      <EmptyState title="No daily numbers yet">
        Once the nightly compile runs, {profile.name}&apos;s last {windowDays}{" "}
        days land here — each figure stamped with where it came from.
      </EmptyState>
    );
  }

  const segments = Array.from(
    new Set(rows.map((r) => r.segment)),
  ) as MetricSegment[];
  const kpiFor = (metric: MetricKey) =>
    profile.kpis.find((k) => (k.mapsTo === "conversions" ? "sales" : k.mapsTo) === metric);

  return (
    <div className="flex flex-col gap-6">
      {segments.map((segment) => {
        const segmentRows = rows
          .filter((r) => r.segment === segment)
          .slice(-windowDays);
        const latest = segmentRows[segmentRows.length - 1];
        if (!latest) return null;

        return (
          <section key={segment} className="flex flex-col gap-3">
            {segments.length > 1 && (
              <h3 className="font-ui text-13 uppercase tracking-wide text-ink-soft">
                {SEGMENT_LABEL[segment]}
              </h3>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {METRICS.map((m) => {
                const series = segmentRows
                  .map((r) => r.metrics[m.key])
                  .filter((v): v is number => v !== undefined);
                const value = latest.metrics[m.key];
                const unavailable = latest.unavailable[m.key];
                const kpi = kpiFor(m.key);
                const target = kpi ? dailyTarget(m.key, kpi.target) : undefined;

                const polarity =
                  config.deltaPolarity[internalKey(m.key)] ?? "neutral";
                const onTrack =
                  value === undefined || target === undefined || polarity === "neutral"
                    ? undefined
                    : polarity === "higher_is_better"
                      ? value >= target
                      : value <= target;

                return (
                  <article
                    key={m.key}
                    className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-ui text-13 uppercase tracking-wide text-ink-soft">
                        {m.label}
                      </p>
                      {unavailable ? (
                        <>
                          <p className="font-display text-22 text-ink-soft">n/a</p>
                          <p className="font-ui text-12 text-ink-soft">{unavailable}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-display text-28 text-ink">
                            {display(m.kind, value)}
                          </p>
                          {target !== undefined && (
                            <p
                              className={cn(
                                "font-ui text-12",
                                onTrack === undefined
                                  ? "text-ink-soft"
                                  : onTrack
                                    ? "text-verdigris"
                                    : "text-negative",
                              )}
                            >
                              {kpi?.label} target {display(m.kind, target)}
                              {isAdditive(m.key) && "/day"}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {series.length > 1 && (
                      <Sparkline
                        series={series}
                        invert={polarity === "lower_is_better"}
                        className="shrink-0 text-ink-soft"
                      />
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="font-ui text-12 text-ink-soft">
        Rolling {windowDays} days · source{" "}
        {rows[rows.length - 1].source === "Tracker" && rows[rows.length - 1].sourceOfTruth
          ? `Tracker · ${rows[rows.length - 1].sourceOfTruth}`
          : rows[rows.length - 1].source}{" "}
        · through{" "}
        {format(parseISO(rows[rows.length - 1].date), "MMM d")}
      </p>
    </div>
  );
}
