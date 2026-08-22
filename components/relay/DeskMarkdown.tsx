"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  parseDeskMarkdown,
  type DeskBlock,
  type InlineRun,
} from "@/lib/desk-markdown";

/* Streaming markdown rendering for the desk transcript — the parser lives
   in lib/desk-markdown (pure, verified by scripts/verify-desk-markdown).

   This side owns the chunk choreography: spans are keyed by their source
   offset, so a re-parse reuses the settled spans untouched, and each
   arrival fades pale-to-ink exactly once — the same choreography the plain
   stream had, now through structure. */

type Chunk = { id: number; text: string };

/* ---- chunk-fade rendering ---------------------------------------------- */

type Bound = { id: number; start: number; end: number };

function chunkBounds(chunks: Chunk[]): Bound[] {
  let acc = 0;
  return chunks.map((c) => {
    const start = acc;
    acc += c.text.length;
    return { id: c.id, start, end: acc };
  });
}

function chunkAt(bounds: Bound[], src: number): number {
  for (const b of bounds) if (src < b.end) return b.id;
  return bounds.length ? bounds[bounds.length - 1].id : 0;
}

function runClass(run: InlineRun): string | undefined {
  let cls = "";
  if (run.bold) cls += " fig-w560";
  if (run.italic) cls += " italic";
  if (run.code) cls += " font-code rounded-4 bg-surface-foreground-01 px-1";
  return cls ? cls.trim() : undefined;
}

function FadeRuns({
  runs,
  breaks,
  bounds,
  fadeMs,
  fromOpacity,
  animate,
}: {
  runs: InlineRun[];
  breaks?: number[];
  bounds: Bound[];
  fadeMs: number;
  fromOpacity: number;
  animate: boolean;
}) {
  const nodes: React.ReactNode[] = [];
  for (const run of runs) {
    if (breaks?.includes(run.src)) nodes.push(<br key={`br${run.src}`} />);
    /* A run split at every chunk seam it spans — each piece mounts with its
       own arrival and fades once. Code runs stay whole (a chip torn across
       two spans would show its seam), taking their first char's chunk. */
    let from = 0;
    while (from < run.text.length) {
      const piece = run.code
        ? run.text
        : run.text.slice(
            from,
            (bounds.find((b) => run.src + from < b.end)?.end ?? Infinity) -
              run.src,
          );
      const src = run.src + from;
      nodes.push(
        <motion.span
          key={src}
          className={runClass(run)}
          initial={animate ? { opacity: fromOpacity } : false}
          animate={{ opacity: 1 }}
          transition={{
            type: "tween",
            duration: fadeMs / 1000,
            ease: "easeOut",
          }}
          data-chunk={chunkAt(bounds, src)}
        >
          {piece}
        </motion.span>,
      );
      from += piece.length;
    }
  }
  return <>{nodes}</>;
}

/** The transcript's formatted voice. Text classes mirror the plain reply
 *  exactly (619:16977's 16px/390 body); structure adds only weight and
 *  rhythm — nothing shouts. */
export function DeskMarkdown({
  chunks,
  lineHeight,
  fadeMs,
  fromOpacity,
  animate,
}: {
  chunks: Chunk[];
  lineHeight?: number;
  fadeMs: number;
  fromOpacity: number;
  animate: boolean;
}) {
  const text = chunks.map((c) => c.text).join("");
  const blocks = useMemo(() => parseDeskMarkdown(text), [text]);
  const bounds = useMemo(() => chunkBounds(chunks), [chunks]);

  const body =
    "w-full font-geist text-fig-chat tracking-chat text-heading-01 [overflow-wrap:anywhere]";
  const fade = { bounds, fadeMs, fromOpacity, animate };

  return (
    <div className="flex w-full flex-col gap-3">
      {blocks.map((b) =>
        b.kind === "h" ? (
          <h3
            key={b.src}
            style={lineHeight ? { lineHeight } : undefined}
            className={`${body} fig-w560 pt-1.5 first:pt-0`}
          >
            <FadeRuns runs={b.runs} {...fade} />
          </h3>
        ) : b.kind === "list" ? (
          <ListBlock key={b.src} block={b}>
            {b.items.map((item) => (
              <li
                key={item.src}
                style={lineHeight ? { lineHeight } : undefined}
                className={`${body} fig-w390 pl-1`}
              >
                <FadeRuns runs={item.runs} {...fade} />
              </li>
            ))}
          </ListBlock>
        ) : (
          <p
            key={b.src}
            style={lineHeight ? { lineHeight } : undefined}
            className={`${body} fig-w390`}
          >
            <FadeRuns runs={b.runs} breaks={b.breaks} {...fade} />
          </p>
        ),
      )}
    </div>
  );
}

function ListBlock({
  block,
  children,
}: {
  block: Extract<DeskBlock, { kind: "list" }>;
  children: React.ReactNode;
}) {
  /* The ol/ul stays a list-item context (markers need it); the flex column
     only spaces the rows. Markers take the explainer grey — the numbers are
     structure, not content. */
  const cls =
    "flex w-full flex-col gap-1.5 pl-5 marker:font-geist marker:text-fig-caption-1-md marker:text-heading-05";
  return block.ordered ? (
    <ol start={block.start} className={`${cls} list-decimal`}>
      {children}
    </ol>
  ) : (
    <ul className={`${cls} list-disc`}>{children}</ul>
  );
}
