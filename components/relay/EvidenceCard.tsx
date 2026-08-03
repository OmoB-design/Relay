import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAsOf } from "@/lib/config";
import { deltaDirection, deltaTone, deltaToneClass } from "@/lib/narrative";
import type { EvidenceItem } from "@/lib/types";
import { Sparkline } from "@/components/relay/Sparkline";

/* EvidenceCard (design.md §3). States:
   - default
   - linked     : wash bg + 3px verdigris left rule (the stitch target)
   - dimmed     : opacity 0.45 (another claim is selected)
   Source chip is logo-less text; Tracker cards append the source of truth
   (e.g. "Tracker · Triple Whale"). */

export type EvidenceCardState = "default" | "linked" | "dimmed";

function sourceChipLabel(item: EvidenceItem): string {
  if (item.source === "Tracker" && item.sourceOfTruth) {
    return `Tracker · ${item.sourceOfTruth}`;
  }
  return item.source;
}

export function EvidenceCard({
  item,
  state = "default",
  asOf,
  compact = false,
  className,
}: {
  item: EvidenceItem;
  state?: EvidenceCardState;
  asOf?: string;
  /** Tighter variant for snapshot dialogs (smaller value, no sparkline/note). */
  compact?: boolean;
  className?: string;
}) {
  const tone = deltaTone(item);
  const direction = deltaDirection(item);
  const DirectionIcon = direction === "down" ? ArrowDown : ArrowUp;

  return (
    <article
      className={cn(
        "flex overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-200",
        state === "linked" && "bg-verdigris-wash",
        state === "dimmed" && "opacity-45",
        className,
      )}
    >
      {state === "linked" && (
        <span aria-hidden="true" className="w-rule shrink-0 bg-verdigris" />
      )}
      <div className={cn("flex flex-1 flex-col gap-2 p-4", compact && "gap-1 p-3")}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full border border-line bg-paper px-2 py-0.5 font-ui text-12 text-ink-soft">
            {sourceChipLabel(item)}
          </span>
          {!compact && item.series && item.series.length > 1 && (
            <Sparkline
              series={item.series}
              invert={item.polarity === "lower_is_better"}
              className={state === "linked" ? "text-verdigris" : "text-ink-soft"}
            />
          )}
        </div>

        <p className="font-ui text-13 uppercase tracking-wide text-ink-soft">
          {item.metricLabel}
        </p>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={cn(
              "font-display text-ink",
              compact ? "text-22" : "text-28",
            )}
          >
            {item.valueDisplay}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 font-ui text-13",
              deltaToneClass(tone),
            )}
          >
            {direction !== "flat" && (
              <DirectionIcon size={14} aria-hidden="true" />
            )}
            {item.deltaLabel}
          </span>
        </div>

        {!compact && item.note && (
          <p className="font-ui text-13 text-ink-soft">{item.note}</p>
        )}

        {asOf && (
          <p className="mt-1 font-ui text-12 text-ink-soft">
            as of {formatAsOf(asOf)}
          </p>
        )}
      </div>
    </article>
  );
}
