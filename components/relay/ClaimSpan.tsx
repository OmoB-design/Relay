"use client";

import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { Claim } from "@/lib/types";

/* ClaimSpan (design.md §3): one sentence inside the narrative body.
   fact  → dotted verdigris underline (45% → 100% on hover/selection); selected
           adds the wash background. Focusable; Enter/Space selects.
   plan  → no underline, italic, subtle "→" prefix — visibly "no evidence
           needed". Not selectable.
   Dimming: when a selection exists elsewhere, unrelated claims fade to the
   config dim opacity (mirrors the evidence rail). */

export function ClaimSpan({
  claim,
  selected,
  highlighted, // reverse stitch: an evidence card that supports this claim is selected
  dimmed,
  onSelect,
}: {
  claim: Claim;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  onSelect?: () => void;
}) {
  const style = { opacity: dimmed ? config.splitView.dimOpacity : 1 };

  if (claim.kind === "plan") {
    return (
      <span
        className="italic text-ink transition-opacity duration-200"
        style={style}
        title="Plan — forward-looking, no evidence needed"
      >
        {claim.text}
      </span>
    );
  }

  const active = selected || highlighted;

  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "cursor-pointer rounded-sm px-0.5 transition-colors duration-200",
        active ? "claim-underline-strong bg-verdigris-wash" : "claim-underline",
        "hover:claim-underline-strong",
      )}
      style={style}
    >
      {claim.text}
    </span>
  );
}
