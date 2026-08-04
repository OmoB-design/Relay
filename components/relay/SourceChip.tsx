import type { DailyRow } from "@/lib/types";

/* The source chip on a digest row — Figma node 303:10644.

   bg surface/foreground-01 · 0.8px stroke · radius 64 (pill) · px 6 · py 4 · gap 4
   Two labels at 10px/1.2 Regular in heading-05, separated by a 3px dot — the
   reader is a numeral, not a bullet character, so it gets its own element. */

export function Dot({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={
        size === "sm"
          ? "size-dot-sm shrink-0 rounded-full bg-grey-300"
          : "size-dot shrink-0 rounded-full bg-grey-300"
      }
    />
  );
}

export function SourceChip({
  source,
  sourceOfTruth,
}: {
  source: DailyRow["source"];
  sourceOfTruth?: DailyRow["sourceOfTruth"];
}) {
  return (
    <span className="inline-flex items-center justify-center gap-1 rounded-full border-fig-08 border-border bg-surface-foreground-01 px-1.5 py-1">
      <span className="font-geist text-fig-caption-2 text-heading-05">
        {source}
      </span>
      {sourceOfTruth && (
        <>
          <Dot />
          <span className="font-geist text-fig-caption-2 text-heading-05">
            {sourceOfTruth}
          </span>
        </>
      )}
    </span>
  );
}
