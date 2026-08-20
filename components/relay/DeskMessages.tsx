"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
/* eslint-disable @next/next/no-img-element -- attachment previews are
   client-side object URLs; next/image cannot optimise a blob. */
import { cn } from "@/lib/utils";
import { DotmCircular8 } from "@/components/ui/dotm-circular-8";
import "@/components/dotmatrix-loader.css";
import {
  CopyGlyph,
  EditSquareGlyph,
  RetryGlyph,
  SparklesGlyph,
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
   AgentReply renders its chunk list exactly that way, and the sparkles spin
   only while the answer is still owed ("Thinking" at caption-2/explainer),
   then rest ("Thought Ns" at caption-1/heading-05 — the set's own size step). */

export type AgentChunk = { id: number; text: string };

/** Every knob the thinking loader exposes, dialed from the desk's panel. */
export type LoaderDials = {
  speed: number;
  size: number;
  dotSize: number;
  color: string;
  halo: number;
  bloom: boolean;
  opacityBase: number;
  opacityMid: number;
  opacityPeak: number;
};

/* The header's two swaps carry transitions.dev's tuned recipes: icon-swap
   (200ms, 2px blur, 0.25 start scale, ease-in-out) between the loader and the
   sparkles, and text-states-swap (200ms, 8px travel, 2px blur, ease-out)
   between "Thinking" and "Thought Ns" — ported into Motion so they respect
   reduced-motion with everything else. */
type SwapRecipe = { duration: number; ease: "easeInOut" | "easeOut" };
const ICON_SWAP: SwapRecipe = { duration: 0.2, ease: "easeInOut" };
const TEXT_SWAP: SwapRecipe = { duration: 0.2, ease: "easeOut" };

function timeAgo(at: number): string {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.round(mins / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

/* The meta icon cluster carries transitions.dev's avatar-group-hover comb:
   the hovered icon lifts −4px and scales 1.05, its neighbours lift with a
   0.45 power falloff, and mouseleave snaps everything back on an overshoot
   curve. Icons rest in the explainer grey and only take ink ON hover. */
const COMB_LIFT = -4;
const COMB_FALLOFF = 0.45;
const COMB_SCALE = 1.05;
const COMB_IN: [number, number, number, number] = [0.22, 1, 0.36, 1];
const COMB_OUT: [number, number, number, number] = [0.34, 3.85, 0.64, 1];

type MetaAction = {
  label: string;
  onClick?: () => void;
  node: React.ReactNode;
  /** The boxed variants (edit square, the agent's undo) keep their own
   *  chrome; everything else colours only under the pointer. */
  className?: string;
};

function MetaIconRow({ actions }: { actions: MetaAction[] }) {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <span
      className="flex items-center gap-1.5"
      onMouseLeave={() => setHovered(null)}
    >
      {actions.map((a, i) => {
        const distance = hovered === null ? null : Math.abs(i - hovered);
        const y =
          distance === null || reducedMotion
            ? 0
            : COMB_LIFT * Math.pow(COMB_FALLOFF, distance);
        const scale =
          !reducedMotion && distance === 0 ? COMB_SCALE : 1;
        return (
          <motion.button
            key={a.label}
            type="button"
            aria-label={a.label}
            title={a.label}
            onClick={a.onClick}
            onMouseEnter={() => setHovered(i)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            animate={{ y, scale }}
            transition={{
              type: "tween",
              duration: 0.32,
              ease: hovered === null ? COMB_OUT : COMB_IN,
            }}
            className={
              a.className ??
              "flex size-4.5 items-center justify-center text-icon-explainer transition-colors duration-200 ease-out hover:text-heading-01"
            }
          >
            {a.node}
          </motion.button>
        );
      })}
    </span>
  );
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

export function UserMessage({
  text,
  at,
  images,
  meta = true,
  onRetry,
  onEdit,
}: {
  text: string;
  at: number;
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
      <div className="flex max-w-full items-center justify-end rounded-14 bg-surface-foreground-01 p-3.5">
        {/* The bubble sits right; the TEXT inside reads left (the reference's
            law) — long questions rag naturally instead of centring ragged. */}
        <p className="text-left font-geist text-fig-body-lg text-heading-01 [overflow-wrap:anywhere]">
          {text}
        </p>
      </div>
      {/* The Hover variant's row (619:15455): time first, then the controls. */}
      {meta && (
      <div className="flex items-center justify-end gap-2.5 rounded-14 px-3.5 py-1 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
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
              node: <EditSquareGlyph className="size-4.5" />,
              className:
                "flex size-4.5 items-center justify-center transition-opacity duration-200 ease-out hover:opacity-80",
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
  thinking,
  thoughtSecs,
  at,
  meta = true,
  chunkFadeMs,
  chunkFromOpacity,
  loader,
  onRetry,
  onUndo,
}: {
  /** The reply so far, in arrival order — one span per chunk so each can
   *  carry its own fade without re-animating the settled ones. */
  chunks: AgentChunk[];
  /** Still owed an answer: the dot loader runs, the label reads "Thinking". */
  thinking: boolean;
  thoughtSecs: number | null;
  at: number;
  /** The greeting is theater — it takes no controls row. */
  meta?: boolean;
  chunkFadeMs: number;
  chunkFromOpacity: number;
  loader: LoaderDials;
  onRetry?: () => void;
  onUndo?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const full = chunks.map((c) => c.text).join("");
  const swap = (recipe: SwapRecipe, scale?: number) => ({
    initial: reducedMotion
      ? false
      : {
          opacity: 0,
          filter: "blur(2px)",
          ...(scale !== undefined ? { scale } : { y: 8 }),
        },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      ...(scale !== undefined ? { scale: 1 } : { y: 0 }),
    },
    exit: {
      opacity: 0,
      filter: "blur(2px)",
      ...(scale !== undefined ? { scale } : { y: -8 }),
    },
    transition: recipe,
  });

  return (
    <div className="group flex w-full flex-col items-start gap-4">
      <div className="flex w-full items-center gap-1">
        {/* The slot takes the CURRENT icon's own size — the loader is dialed
            independently of the 16px sparkles, and the gap to the label must
            read the same either way. */}
        <span
          className="flex items-center justify-center transition-[width,height] duration-200 ease-out"
          style={{
            width: thinking ? loader.size : 16,
            height: thinking ? loader.size : 16,
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {thinking ? (
              <motion.span
                key="loader"
                {...swap(ICON_SWAP, 0.25)}
                className="flex items-center justify-center"
              >
                <DotmCircular8
                  ariaLabel="Thinking"
                  speed={loader.speed}
                  size={loader.size}
                  dotSize={loader.dotSize}
                  color={loader.color}
                  halo={loader.halo}
                  bloom={loader.bloom}
                  opacityBase={loader.opacityBase}
                  opacityMid={loader.opacityMid}
                  opacityPeak={loader.opacityPeak}
                />
              </motion.span>
            ) : (
              <motion.span
                key="sparkles"
                {...swap(ICON_SWAP, 0.25)}
                className="flex items-center justify-center text-heading-01"
              >
                <SparklesGlyph className="size-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="relative flex items-center">
          <AnimatePresence mode="wait" initial={false}>
            {thinking ? (
              <motion.span
                key="thinking"
                {...swap(TEXT_SWAP)}
                className="font-geist text-fig-caption-1-md fig-medium text-heading-05"
              >
                Thinking
              </motion.span>
            ) : thoughtSecs !== null ? (
              <motion.span
                key="thought"
                {...swap(TEXT_SWAP)}
                className="font-geist text-fig-caption-1-md fig-medium text-heading-05"
              >
                {`Thought ${thoughtSecs}s`}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </div>
      {chunks.length > 0 && (
        <div className="flex w-full flex-col items-start justify-center gap-2.5 py-2.5">
          <p className="w-full font-geist text-fig-chat fig-w390 tracking-chat text-heading-01 [overflow-wrap:anywhere]">
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
          {/* The Hover variant's row (619:16951): controls first, time last —
              mirrored from the user's. */}
          {meta && (
          <div
            className={cn(
              "flex items-center justify-end gap-2.5 rounded-14 py-1 pr-3.5 opacity-0 transition-opacity duration-200 ease-out",
              !thinking && "group-hover:opacity-100",
            )}
          >
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
                  className:
                    "flex size-4.5 items-center justify-center overflow-clip rounded-4 bg-surface-foreground-02 p-1 text-icon-system transition-colors duration-200 ease-out hover:text-heading-01",
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
        </div>
      )}
    </div>
  );
}

