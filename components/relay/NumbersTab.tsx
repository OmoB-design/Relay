"use client";

import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { config, formatCurrency } from "@/lib/config";
import type { ClientProfile, DailyMetrics, DailyRow, MetricSegment } from "@/lib/types";
import { TrendSparkline } from "@/components/relay/TrendSparkline";
import { LineChart } from "lucide-react";
import { EmptyPanel } from "@/components/relay/EmptyPanel";

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

/** One metric's card — Figma set 676:6444, all ten variants one anatomy:
 *  label over a Helvetica Neue value on the left, the bare sparkline on the
 *  right when a trend exists (the set's foreground-01 frame was only its
 *  placeholder), a hairline seam, and the judged caption below — green-700
 *  on track, red-700 off, body grey for a source's own n/a reason. The
 *  design catalogue renders every state at /design/numbers. */
export function MetricCard({
  label,
  kind,
  value,
  unavailable,
  target,
  targetLabel,
  perDay = false,
  polarity,
  series,
}: {
  label: string;
  kind: "money" | "count" | "ratio" | "percent";
  value: number | undefined;
  /** The source's own reason the figure is missing — renders the n/a state. */
  unavailable?: string;
  target?: number;
  targetLabel?: string;
  /** Additive metrics judge a pro-rated daily share — the label says so. */
  perDay?: boolean;
  polarity: "higher_is_better" | "lower_is_better" | "neutral";
  series: { date: string; value: number }[];
}) {
  const onTrack =
    value === undefined || target === undefined || polarity === "neutral"
      ? undefined
      : polarity === "higher_is_better"
        ? value >= target
        : value <= target;

  const caption = unavailable ? (
    <p className="truncate font-geist text-fig-caption-1-md fig-medium text-heading-06">
      {unavailable}
    </p>
  ) : target !== undefined ? (
    <p
      className={cn(
        "truncate font-geist text-fig-caption-1-md fig-medium",
        onTrack === undefined
          ? "text-heading-06"
          : onTrack
            ? "text-green-700"
            : "text-red-700",
      )}
    >
      {targetLabel} target {display(kind, target)}
      {perDay && "/day"}
    </p>
  ) : null;

  return (
    <article className="flex w-full flex-col overflow-clip rounded-14 border border-border bg-surface-primary shadow-metric-card">
      <div className="w-full pb-2.5">
        <div className="flex w-full items-start gap-2.5 divider-b border-border px-4 pb-3 pt-3.5">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
            <p className="w-full truncate font-geist text-fig-body-sm fig-medium text-heading-05">
              {label}
            </p>
            <p className="whitespace-nowrap py-0.5 font-greeting text-fig-h5 fig-medium text-heading-02">
              {unavailable ? "n/a" : display(kind, value)}
            </p>
          </div>
          {/* The foreground-01 frame in Figma was only the sparkline's
              placeholder — the real graph stands alone. Sparse series draw
              nothing (676:6865): one point is not a trend. */}
          {series.length > 1 && (
            <TrendSparkline
              className="self-center"
              points={series}
              polarity={polarity}
              target={target}
              formatValue={(v) => display(kind, v)}
            />
          )}
        </div>
      </div>
      {/* The caption row keeps its height even empty — ten cards, one grid,
          one baseline. */}
      <div className="flex min-h-6.5 w-full items-start px-4 pb-3.5">
        {caption}
      </div>
    </article>
  );
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
      <EmptyPanel
        title="No daily numbers yet"
        glyph={
          <LineChart
            size={14}
            aria-hidden="true"
            className="text-icon-explainer"
          />
        }
      >
        Once the nightly compile runs, {profile.name}&apos;s last {windowDays}{" "}
        days land here — each figure stamped with where it came from.
      </EmptyPanel>
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
        if (segmentRows.length === 0) return null;

        /* CORRELATION RULE: each card shows its metric's latest AVAILABLE
           value in the window — never a dash from a row the source skipped —
           so the big number always equals the sparkline's endpoint. A metric
           with no value anywhere in the window goes n/a with the source's
           own reason: its per-metric note, else the row-level "_row" note
           the nightly compile leaves when a whole day is missing. */
        const latestValue = (key: MetricKey): number | undefined => {
          for (let i = segmentRows.length - 1; i >= 0; i--) {
            const v = segmentRows[i]!.metrics[key];
            if (v !== undefined) return v;
          }
          return undefined;
        };
        const reasonFor = (key: MetricKey): string => {
          for (let i = segmentRows.length - 1; i >= 0; i--) {
            const r = segmentRows[i]!.unavailable[key];
            if (r) return r;
          }
          for (let i = segmentRows.length - 1; i >= 0; i--) {
            const r = (
              segmentRows[i]!.unavailable as Record<string, string | undefined>
            )["_row"];
            if (r) return r;
          }
          return `No data in the last ${windowDays} days`;
        };

        return (
          <section key={segment} className="flex flex-col gap-3">
            {segments.length > 1 && (
              <h3 className="font-geist text-fig-caption-1-md fig-medium uppercase text-heading-06">
                {SEGMENT_LABEL[segment]}
              </h3>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {METRICS.map((m) => {
                const series = segmentRows.flatMap((r) => {
                  const v = r.metrics[m.key];
                  return v === undefined ? [] : [{ date: r.date, value: v }];
                });
                const value = latestValue(m.key);
                const unavailable =
                  value === undefined ? reasonFor(m.key) : undefined;
                const kpi = kpiFor(m.key);
                const target = kpi ? dailyTarget(m.key, kpi.target) : undefined;

                const polarity =
                  config.deltaPolarity[internalKey(m.key)] ?? "neutral";

                return (
                  <MetricCard
                    key={m.key}
                    label={m.label}
                    kind={m.kind}
                    value={value}
                    unavailable={unavailable}
                    target={target}
                    targetLabel={kpi?.label}
                    perDay={isAdditive(m.key)}
                    polarity={polarity}
                    series={series}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="font-geist text-fig-caption-2 text-heading-06">
        {/* The stamp tells the truth about DATA, not rows: "through" is the
            last day the source actually reported — the engine's own
            confidence language — never an empty row's date. */}
        {(() => {
          const dataRows = rows.filter((r) =>
            Object.values(r.metrics).some((v) => v !== undefined),
          );
          const stamp = dataRows[dataRows.length - 1] ?? rows[rows.length - 1];
          return (
            <>
              Rolling {windowDays} days · source{" "}
              {stamp.source === "Tracker" && stamp.sourceOfTruth
                ? `Tracker · ${stamp.sourceOfTruth}`
                : stamp.source}{" "}
              · through {format(parseISO(stamp.date), "MMM d")}
            </>
          );
        })()}
      </p>
    </div>
  );
}
