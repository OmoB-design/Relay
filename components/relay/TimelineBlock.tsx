"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useDialKit } from "dialkit";
import type { AnswerThread, EvidenceSnapshot, TimelineEntry } from "@/lib/types";
import { EmptyState } from "@/components/relay/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EvidenceCard } from "@/components/relay/EvidenceCard";
import { formatAsOf } from "@/lib/config";

/* The timeline block — Figma 728:10423, with its two row species:

   TIMELINE ANSWER (718:9677). Collapsed, one calm line: speech glyph, date,
   headline, chevron. Expanded, the exchange replays as three strata — the
   header stays white, the QUESTION sits on foreground-01 under the asker's
   initial, Relay's ANSWER sits deeper on foreground-02 under the bird — and
   a hairline thread runs avatar to mark: who asked, what Relay said, in
   that order. A blue rail (blue-500) hangs OUTSIDE the card's left edge,
   marking the open exchange from the margin.

   TIMELINE INSIGHT (720:10124). Same shell; the body is Relay's own
   commentary on foreground-01, indented to the title's left edge, and the
   rail goes blue-900 — the agency's voice, a register deeper than an
   answered question.

   Both close with "View data snapshot" on the dashboard wash — the same
   immutable-evidence dialog the Library uses. Attribution (the "Dana"
   line) renders only when the entry knows its asker; the Slack layer will
   stamp that name, and until then an unattributed question shows no name
   rather than a guessed one. */

/* One hairline everywhere (the banding law): the card wears border-fig and
   the strips separate with divider-t, never their own l/r strokes. */

const DATE_FMT = "EEE, MMM d";

/* The rail and thread geometry, from the nodes: the rail hangs 13px into
   the margin, 3px wide, from under the 57px header to above the 53px
   footer (717:9659); the thread sits on the icon column's centreline,
   15px in (714:9623). Pixel geometry, not spacing rhythm — inline. */
const RAIL = (color: string) =>
  ({
    left: -13,
    width: 3,
    top: 57,
    bottom: 53,
    background: `var(${color})`,
  }) as React.CSSProperties;
const THREAD_X = 15;

/* The buttery settle the whole app rides (DeskSideBar's EASE): fast out of
   the gate, long soft landing — ink reaching the bottom of the margin. */
const RAIL_EASE = [0.22, 1, 0.36, 1] as const;

export type RailDial = { flowMs: number; outMs: number };

/** The highlighter POURS (user-directed): on open it flows top-to-bottom
 *  down the margin rather than appearing — the sensation of a fluid
 *  highlighter marking the open frame. On close it lets go in a quick
 *  fade; a reverse pour would make closing feel like rewinding. */
function Rail({
  expanded,
  color,
  dial,
}: {
  expanded: boolean;
  color: string;
  dial: RailDial;
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {expanded && (
        <motion.span
          aria-hidden
          className="absolute origin-top rounded-4"
          style={RAIL(color)}
          initial={reduced ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: dial.outMs / 1000, ease: "easeOut" },
          }}
          transition={{
            type: "tween",
            duration: dial.flowMs / 1000,
            ease: RAIL_EASE,
          }}
        />
      )}
    </AnimatePresence>
  );
}

function SpeechGlyph({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <path
        d="M6 0.75C3.101 0.75 0.75 3.1 0.75 6C0.75 7.082 1.079 8.088 1.64 8.923C1.453 9.699 1.166 10.474 0.75 11.25C1.911 11.25 2.888 11.059 3.703 10.7C4.399 11.041 5.172 11.25 6 11.25C8.899 11.25 11.25 8.899 11.25 6C11.25 3.101 8.899 0.75 6 0.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NoteGlyph({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <path d="M3.83371 7.5H6.00037" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.83371 5.50028H8.16704" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.83371 3.49972H8.16704" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M8.83315 1.16685H3.16648C2.4301 1.16685 1.83315 1.76381 1.83315 2.50019V9.50019C1.83315 10.2366 2.4301 10.8335 3.16648 10.8335H8.83315C9.56953 10.8335 10.1665 10.2366 10.1665 9.50019V2.50019C10.1665 1.76381 9.56953 1.16685 8.83315 1.16685Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronGlyph({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path
        d="M4.95833 11.9583L9.91667 7L4.95833 2.04167"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SnapshotGlyph({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path
        d="M7 5.05556C9.68472 5.05556 11.8611 4.27205 11.8611 3.30556C11.8611 2.33906 9.68472 1.55556 7 1.55556C4.31528 1.55556 2.13889 2.33906 2.13889 3.30556C2.13889 4.27205 4.31528 5.05556 7 5.05556Z"
        stroke="currentColor"
        strokeWidth="1.16667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.13889 3.30556V10.6944C2.13889 11.6612 4.31511 12.4444 7 12.4444C9.68489 12.4444 11.8611 11.6612 11.8611 10.6944V3.30556"
        stroke="currentColor"
        strokeWidth="1.16667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.13889 7C2.13889 7.96678 4.31511 8.75 7 8.75C9.68489 8.75 11.8611 7.96678 11.8611 7"
        stroke="currentColor"
        strokeWidth="1.16667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The bird on its 22px disc (714:9605/9617, verbatim vectors) — Relay's
 *  voice marking the answer stratum. */
function RelayMarkBadge() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="11" className="fill-grey-200" />
      <path
        d="M16.1684 10.067C15.7458 9.64449 15.059 9.64449 14.6364 10.067L13.5306 11.1906C13.488 10.9947 13.3928 10.8078 13.2406 10.6558C13.0023 10.4176 12.6799 10.3186 12.3681 10.3492C12.3715 10.3135 12.3784 10.2787 12.3784 10.2424C12.3784 9.95262 12.2658 9.68082 12.062 9.47735C11.8325 9.24755 11.5048 9.15169 11.1891 9.18095C11.2229 8.86602 11.1243 8.53949 10.8836 8.29862C10.461 7.87642 9.77382 7.87709 9.35136 8.29862L8.11142 9.53855L8.34096 8.06555C8.37576 7.77842 8.29602 7.49462 8.11669 7.26642C7.93762 7.03922 7.68116 6.89469 7.39502 6.86049C6.81362 6.78629 6.33576 7.16095 6.19382 7.78462L5.60916 10.4259C5.30936 11.8384 5.74002 13.2914 6.76116 14.3123L7.58376 15.1349C8.26049 15.8116 9.16022 16.1844 10.1176 16.1844C11.075 16.1844 11.9744 15.8116 12.6512 15.1349L16.1684 11.5988C16.3726 11.395 16.4852 11.1229 16.4852 10.8332C16.4852 10.5429 16.3725 10.2708 16.1684 10.067Z"
        fill="#050505"
      />
    </svg>
  );
}

/** The asker's initial on the same disc — attribution's face. */
function AskerBadge({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-grey-200 font-geist text-fig-caption-1 text-black"
    >
      {name[0]?.toUpperCase()}
    </span>
  );
}

/* The engine emphasizes with **markdown**; a pinned answer keeps its weight
   here too. Bold-only on purpose — timeline bodies are single paragraphs. */
function emphasized(text: string): React.ReactNode {
  const parts = text.split("**");
  if (parts.length < 3) return text;
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="fig-sb">
        {p}
      </strong>
    ) : (
      p
    ),
  );
}

/* ---- shared row anatomy -------------------------------------------------- */

function RowHeader({
  glyph,
  date,
  title,
  expanded,
  onToggle,
}: {
  glyph: React.ReactNode;
  date: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="flex w-full items-center gap-1.5 py-2.5 pl-2 pr-3.5 text-left"
    >
      <span className="flex items-start self-start pt-0.5">{glyph}</span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="font-geist text-fig-caption-1 text-heading-06">
          {format(parseISO(date), DATE_FMT)}
        </span>
        <span className="w-full truncate font-geist text-fig-caption-1-md fig-sb text-heading-01">
          {title}
        </span>
      </span>
      <ChevronGlyph
        className={`shrink-0 text-icon-explainer transition-transform duration-200 ease-out ${
          expanded ? "rotate-90" : ""
        }`}
      />
    </button>
  );
}

function SnapshotFooter({ snapshot }: { snapshot: EvidenceSnapshot }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full flex-col items-end justify-center bg-surface-dashboard p-2.5">
      <div className="flex w-full flex-col items-end px-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center justify-center gap-1 rounded-8 border-fig border-border bg-surface-primary px-2.5 py-2 font-geist text-fig-caption-1-md fig-sb text-heading-01 transition-colors duration-150 ease-out hover:bg-surface-foreground-01"
          >
            <SnapshotGlyph className="text-heading-05" />
            View data snapshot
          </button>
          <DialogContent className="max-h-dialog-cap overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-geist text-fig-h5 fig-medium text-heading-01">
                Data snapshot — {snapshot.period.label}
              </DialogTitle>
              <DialogDescription className="font-geist text-fig-body fig-w450 text-heading-06">
                Immutable evidence, {formatAsOf(snapshot.asOf)}. Artifacts are
                shown against the data they were written from.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {snapshot.items.map((item) => (
                <EvidenceCard key={item.id} item={item} />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

/* ---- the two species ------------------------------------------------------ */

function AnswerRow({
  entry,
  snapshot,
  thread,
  railDial,
}: {
  entry: TimelineEntry;
  snapshot?: EvidenceSnapshot;
  thread?: AnswerThread;
  railDial: RailDial;
}) {
  const [expanded, setExpanded] = useState(false);
  const question = thread?.question;
  const answerText = thread?.answer?.text ?? entry.body;

  return (
    <li className="relative">
      <Rail expanded={expanded} color="--color-blue-500" dial={railDial} />
      <div
        className={`flex w-full flex-col overflow-clip rounded-14 border-fig border-border bg-surface-primary ${
          expanded ? "shadow-timeline-lift" : ""
        }`}
      >
        <RowHeader
          glyph={<SpeechGlyph className="text-heading-05" />}
          date={entry.date}
          title={entry.summary}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
        {expanded && (
          <>
            {question && (
              <div className="relative flex w-full items-start gap-2.5 divider-t border-border bg-surface-foreground-01 py-3 pl-1 pr-3.5">
                {/* The thread's upper reach: from under the avatar to the
                    strip's floor, meeting its twin across the seam. */}
                <span
                  aria-hidden
                  className="absolute bottom-0 w-px bg-grey-200"
                  style={{ left: THREAD_X, top: 36 }}
                />
                <span className="pt-0.5">
                  <AskerBadge name={entry.askedBy ?? "?"} />
                </span>
                <span className="flex min-w-0 flex-col gap-1.5 pt-0.5">
                  {entry.askedBy && (
                    <span className="font-geist text-fig-body fig-w450 text-heading-04">
                      {entry.askedBy}
                    </span>
                  )}
                  <span className="font-geist text-fig-body fig-w450 text-heading-03 [overflow-wrap:anywhere]">
                    “{question}”
                  </span>
                </span>
              </div>
            )}
            {answerText && (
              <div className="relative flex w-full items-start gap-2.5 divider-t divider-b border-border bg-surface-foreground-02 py-3 pl-1 pr-3.5">
                {question && (
                  <span
                    aria-hidden
                    className="absolute top-0 w-px bg-grey-200"
                    style={{ left: THREAD_X, height: 14 }}
                  />
                )}
                <span className="pt-0.5">
                  <RelayMarkBadge />
                </span>
                <p className="min-w-0 flex-1 pt-0.5 font-geist text-fig-body fig-w450 leading-normal text-heading-01 [overflow-wrap:anywhere]">
                  {emphasized(answerText)}
                </p>
              </div>
            )}
            {snapshot && <SnapshotFooter snapshot={snapshot} />}
          </>
        )}
      </div>
    </li>
  );
}

function InsightRow({
  entry,
  snapshot,
  railDial,
}: {
  entry: TimelineEntry;
  snapshot?: EvidenceSnapshot;
  railDial: RailDial;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="relative">
      <Rail expanded={expanded} color="--color-blue-900" dial={railDial} />
      <div
        className={`flex w-full flex-col overflow-clip rounded-14 border-fig border-border bg-surface-primary ${
          expanded ? "shadow-timeline-lift" : ""
        }`}
      >
        <RowHeader
          glyph={<NoteGlyph className="text-heading-05" />}
          date={entry.date}
          title={entry.summary}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
        {expanded && (
          <>
            {entry.body && (
              /* The body indents to the title's left edge (718:10050's
                 25px), not the glyph's — Relay's own voice, no badge. */
              <div className="flex w-full divider-t border-border bg-surface-foreground-01 py-2.5 pl-6.5 pr-3.5">
                <p className="min-w-0 flex-1 font-geist text-fig-body fig-w450 leading-normal text-heading-03 [overflow-wrap:anywhere]">
                  {emphasized(entry.body)}
                </p>
              </div>
            )}
            {snapshot && <SnapshotFooter snapshot={snapshot} />}
          </>
        )}
      </div>
    </li>
  );
}

/* ---- the block ------------------------------------------------------------ */

export function TimelineBlock({
  entries,
  snapshots,
  threads,
}: {
  entries: TimelineEntry[];
  snapshots: Record<string, EvidenceSnapshot>;
  threads: Record<string, AnswerThread>;
}) {
  /* The highlighter's pour, on dials ("Timeline interactions", dev-only
     panel) — tune, then bake the values here as the defaults. */
  const dial = useDialKit("Timeline interactions", {
    rail: {
      flowMs: [550, 150, 1200, 10],
      outMs: [120, 40, 400, 10],
    },
  });

  if (entries.length === 0) {
    return (
      <EmptyState title="Nothing tracked yet">
        Every commentary, answer, and flag will land here, pinned to its data.
      </EmptyState>
    );
  }

  return (
    <section className="flex w-full flex-col gap-0.5 rounded-18 border-fig border-border bg-surface-dashboard p-1 shadow-timeline-well">
      <div className="flex w-full px-2.5 py-1.5">
        {/* The well's quiet nameplate (683:8695): a chip that is all shadow,
            no stroke — it labels, it doesn't invite. */}
        <span className="flex items-center rounded-8 py-0.5 font-geist text-fig-caption-1 text-heading-06 shadow-control">
          Timeline
        </span>
      </div>
      <ul className="flex w-full flex-col gap-1">
        {entries.map((entry) =>
          entry.type === "answer" ? (
            <AnswerRow
              key={entry.id}
              entry={entry}
              snapshot={entry.snapshotId ? snapshots[entry.snapshotId] : undefined}
              thread={entry.refId ? threads[entry.refId] : undefined}
              railDial={dial.rail}
            />
          ) : (
            <InsightRow
              key={entry.id}
              entry={entry}
              snapshot={entry.snapshotId ? snapshots[entry.snapshotId] : undefined}
              railDial={dial.rail}
            />
          ),
        )}
      </ul>
    </section>
  );
}
