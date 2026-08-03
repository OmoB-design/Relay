"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ChevronDown,
  FileText,
  MessagesSquare,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceSnapshot, TimelineEntry } from "@/lib/types";
import { EmptyState } from "@/components/relay/EmptyState";
import { SnapshotButton } from "@/components/relay/SnapshotButton";

/* Timeline (design.md §4.2): vertical feed, newest first, visually calm.
   Row: type icon, date, one-line summary → expands to the full artifact +
   "View data snapshot" (shared SnapshotButton — compact EvidenceCards). */

const TYPE_ICON: Record<TimelineEntry["type"], LucideIcon> = {
  commentary: FileText,
  answer: MessagesSquare,
  flag: TriangleAlert,
};

function EntryRow({
  entry,
  snapshot,
}: {
  entry: TimelineEntry;
  snapshot?: EvidenceSnapshot;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICON[entry.type];

  return (
    <li className="flex gap-3 px-4 py-3">
      <Icon
        size={16}
        aria-label={entry.type}
        className={cn(
          "mt-1 shrink-0",
          entry.type === "flag" ? "text-flag" : "text-ink-soft",
        )}
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-start justify-between gap-2 text-left"
        >
          <span className="min-w-0">
            <span className="block font-ui text-12 text-ink-soft">
              {format(parseISO(entry.date), "EEE, MMM d")}
            </span>
            <span className="block font-ui text-14 text-ink">
              {entry.summary}
            </span>
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={cn(
              "mt-1 shrink-0 text-ink-soft transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>

        {expanded && (
          <div className="mt-2 flex flex-col gap-3">
            {entry.body && (
              <p className="font-narrative text-16 text-ink">{entry.body}</p>
            )}
            {snapshot && (
              <div>
                <SnapshotButton snapshot={snapshot} />
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function TimelineFeed({
  entries,
  snapshots,
}: {
  entries: TimelineEntry[];
  snapshots: Record<string, EvidenceSnapshot>;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState title="Nothing tracked yet">
        Every commentary, answer, and flag will land here, pinned to its data.
      </EmptyState>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {entries.map((entry) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          snapshot={entry.snapshotId ? snapshots[entry.snapshotId] : undefined}
        />
      ))}
    </ul>
  );
}
