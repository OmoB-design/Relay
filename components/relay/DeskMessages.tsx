"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DotmCircular5 } from "@/components/ui/dotm-circular-5";
import "@/components/dotmatrix-loader.css";
/* eslint-disable @next/next/no-img-element -- attachment previews are
   client-side object URLs; next/image cannot optimise a blob. */
import {
  CopyGlyph,
  EditPencilGlyph,
  RetryGlyph,
  UndoGlyph,
} from "@/components/relay/NavIcons";

/* The desk transcript's two voices — Figma sets 619:15490 (user) and
   619:17022 (agent), all five variants.

   THE META ROWS LIVE ON HOVER. Both frames draw the time-and-controls row at
   opacity 0 in their resting variants and 1 on Hover — the transcript reads
   clean until you reach for a message. The rows are real (buttons, not
   markup): copy is the clipboard, retry re-asks, edit hands the question back
   to the composer.

   THE AGENT STREAMS IN CHUNKS THAT DARKEN. The reference video lands each new
   span of text pale and fades it to ink while the next arrives behind it;
   AgentReply renders its chunk list exactly that way. The reply carries NO
   header: the dotmatrix shimmer runs below the text through thinking and
   streaming, then freezes in place when the reply is done (claude 2.mov). */

export type AgentChunk = { id: number; text: string };

/** The thinking shimmer's knobs — the dotm-circular-5 loader, dialed from
 *  the desk's panel. It runs alone at the reply's first-line slot, rides
 *  below the streaming text, and freezes still under the finished reply. */
export type LoaderDials = {
  speed: number;
  size: number;
  dotSize: number;
  color: string;
  halo: number;
  bloom: boolean;
};

function timeAgo(at: number): string {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.round(mins / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

/* The user bubble, with the reference video's clamp: the frame never grows
   past 320 wide, so long questions fall vertically — and past ten lines the
   bubble folds. The last two visible lines dissolve into the bubble's own
   wash, and a quiet "Show more" sits below in its own zone: plain text at
   rest, a grey pill wash under the pointer (the composer's + button
   language). Expand and collapse are INSTANT — the video swaps states
   between adjacent frames, no height tween. */
/* Ten lines shown, fold only past twelve — computed from the LIVE leading so
   the law holds at any type dial value (15px body × lineHeight × lines). */
const clampHeights = (lineHeight: number) => ({
  show: Math.round(15 * lineHeight * 10),
  past: Math.round(15 * lineHeight * 12),
});

function ClampedBubble({
  text,
  lineHeight = 1.2,
}: {
  text: string;
  lineHeight?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const { show, past } = clampHeights(lineHeight);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setOverflows(el.scrollHeight > past);
    // A different (edited/retried) text starts folded again.
    setExpanded(false);
  }, [text, past]);

  const clamped = overflows && !expanded;
  return (
    <div className="flex max-w-user-bubble flex-col items-start rounded-14 bg-surface-foreground-01 p-3.5">
      {/* overflow-hidden, not clip: clip zeroes scrollHeight and the fold
          could never measure its own overflow. */}
      <div
        ref={textRef}
        className="relative w-full overflow-hidden"
        style={{ maxHeight: clamped ? show : undefined }}
      >
        {/* The bubble sits right; the TEXT inside reads left (the reference's
            law) — long questions rag naturally instead of centring ragged. */}
        <p
          style={{ lineHeight }}
          className="text-left font-geist text-fig-body-lg text-heading-01 [overflow-wrap:anywhere]"
        >
          {text}
        </p>
        {clamped && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-9 user-clamp-fade"
          />
        )}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="-ml-1.5 mt-2 rounded-8 px-1.5 py-1 font-geist text-fig-caption-1-md fig-medium text-heading-03 transition-colors duration-150 ease-out hover:bg-surface-foreground-02"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/* The meta icon cluster: still buttons, no theater. Every icon — the pencil
   and the agent's undo included — rests chromeless in the explainer grey;
   ink and any box fill arrive only under the pointer. */
type MetaAction = {
  label: string;
  onClick?: () => void;
  node: React.ReactNode;
  /** For icons whose hover brings back their Figma box (the agent's undo). */
  className?: string;
};

function MetaIconRow({ actions }: { actions: MetaAction[] }) {
  return (
    <span className="flex items-center gap-1.5">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          aria-label={a.label}
          title={a.label}
          onClick={a.onClick}
          className={
            a.className ??
            /* Every icon's housing frame washes on pointer-enter (the
               composer's + button language) — never just the glyph. */
            "flex size-4.5 items-center justify-center rounded-4 text-icon-explainer transition-colors duration-200 ease-out hover:bg-surface-foreground-02 hover:text-heading-01"
          }
        >
          {a.node}
        </button>
      ))}
    </span>
  );
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

export function UserMessage({
  text,
  at,
  lineHeight,
  images,
  meta = true,
  onRetry,
  onEdit,
}: {
  text: string;
  at: number;
  /** Dial-driven leading (Desk interactions → type.userLine). */
  lineHeight?: number;
  /** Attached screenshots — client-side object URLs, shown above the pill. */
  images?: string[];
  /** The scope pill is theater — it takes no retry/edit row. */
  meta?: boolean;
  onRetry?: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="group flex w-full flex-col items-end justify-center gap-1.5">
      {images && images.length > 0 && (
        <div className="flex max-w-full flex-wrap justify-end gap-1.5">
          {images.map((src) => (
            <img
              key={src}
              src={src}
              alt="Attached image"
              className="h-28 max-w-44 rounded-10 border-fig border-border object-cover"
            />
          ))}
        </div>
      )}
      <ClampedBubble text={text} lineHeight={lineHeight} />
      {/* The Hover variant's row (619:15455): time first, then the controls. */}
      {meta && (
      /* 12px under the pill's bottom edge (user-set), flush with its right
         edge — the column gap and the row's own top pad split the twelve. */
      <div className="flex items-center justify-end gap-2.5 rounded-14 pb-1 pt-1.5 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
        <span className="text-right font-geist text-fig-caption-2 fig-medium text-icon-explainer">
          {timeAgo(at)}
        </span>
        <MetaIconRow
          actions={[
            {
              label: "Ask again",
              onClick: onRetry,
              node: <RetryGlyph className="size-3" />,
            },
            {
              label: "Edit question",
              onClick: onEdit,
              node: <EditPencilGlyph className="size-4.5" />,
            },
            {
              label: "Copy",
              onClick: () => copyText(text),
              node: <CopyGlyph className="size-3" />,
            },
          ]}
        />
      </div>
      )}
    </div>
  );
}

export function AgentReply({
  chunks,
  phase,
  at,
  lineHeight,
  meta = true,
  tail = false,
  chunkFadeMs,
  chunkFromOpacity,
  loader,
  onRetry,
  onUndo,
}: {
  /** The reply so far, in arrival order — one span per chunk so each can
   *  carry its own fade without re-animating the settled ones. */
  chunks: AgentChunk[];
  /** The reference video's three acts: "thinking" — no text yet, the
   *  shimmer runs alone at the reply's first-line slot; "streaming" — text
   *  arrives above while the shimmer rides below it, still alive; "done" —
   *  the shimmer freezes into the static sparkles one line under the reply.
   *  No header, no label, ever. */
  phase: "thinking" | "streaming" | "done";
  at: number;
  /** Dial-driven leading (Desk interactions → type.agentLine). */
  lineHeight?: number;
  /** The greeting is theater — it takes no controls row. */
  meta?: boolean;
  /** True on the transcript's LAST agent reply — the only one that keeps
   *  the frozen mark (the video holds exactly one under the tail). */
  tail?: boolean;
  chunkFadeMs: number;
  chunkFromOpacity: number;
  loader: LoaderDials;
  onRetry?: () => void;
  onUndo?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const full = chunks.map((c) => c.text).join("");

  return (
    <div className="group flex w-full flex-col items-start gap-4">
      {chunks.length > 0 && (
        <div className="flex w-full flex-col items-start justify-center py-2.5">
          <p
            style={lineHeight ? { lineHeight } : undefined}
            className="w-full font-geist text-fig-chat fig-w390 tracking-chat text-heading-01 [overflow-wrap:anywhere]"
          >
            {chunks.map((c) => (
              <motion.span
                key={c.id}
                initial={
                  reducedMotion ? false : { opacity: chunkFromOpacity }
                }
                animate={{ opacity: 1 }}
                transition={{
                  type: "tween",
                  duration: chunkFadeMs / 1000,
                  ease: "easeOut",
                }}
              >
                {c.text}
              </motion.span>
            ))}
          </p>
        </div>
      )}
      {/* The Hover variant's row (619:16951): controls first, time last —
          mirrored from the user's. Only a finished reply has one, and it
          sits ABOVE the mark — the reply's tail glyph closes the message. */}
      {meta && phase === "done" && (
        /* Pulled to 12px under the text (user-set): the -mt eats the group
           gap so the mark's own spacing below stays whole. */
        <div className="-mt-4.5 flex items-center justify-end gap-2.5 rounded-14 py-1 pr-3.5 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
          <MetaIconRow
            actions={[
              {
                label: "Copy",
                onClick: () => copyText(full),
                node: <CopyGlyph className="size-3" />,
              },
              {
                label: "Take into composer",
                onClick: onUndo,
                node: <UndoGlyph className="size-3" />,
                /* Chromeless at rest; its Figma box fill is the hover. */
                className:
                  "flex size-4.5 items-center justify-center overflow-clip rounded-4 p-1 text-icon-explainer transition-colors duration-200 ease-out hover:bg-surface-foreground-02 hover:text-heading-01",
              },
              {
                label: "Ask again",
                onClick: onRetry,
                node: <RetryGlyph className="size-3" />,
              },
            ]}
          />
          <span className="text-right font-geist text-fig-caption-2 fig-medium text-icon-explainer">
            {timeAgo(at)}
          </span>
        </div>
      )}
      {/* The indicator rides BELOW everything (the video's law): the shimmer
          alone before any text, still alive under the growing reply — and on
          the LATEST finished reply it FREEZES in place, the same glyph gone
          still. Older replies give the mark up; the video keeps exactly one. */}
      {(phase !== "done" || tail) && (
        <span
          className="flex items-center justify-center"
          style={{ width: loader.size, height: loader.size }}
        >
          <DotmCircular5
            ariaLabel={phase === "done" ? "Answered" : "Thinking"}
            animated={phase !== "done"}
            speed={loader.speed}
            size={loader.size}
            dotSize={loader.dotSize}
            color={loader.color}
            halo={loader.halo}
            bloom={loader.bloom}
          />
        </span>
      )}
    </div>
  );
}

