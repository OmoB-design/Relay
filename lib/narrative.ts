import { config } from "@/lib/config";
import type {
  Claim,
  EvidenceItem,
  EvidenceRef,
  EvidenceSnapshot,
  MetricKey,
  Narrative,
} from "@/lib/types";

/* ============================================================================
   Claim <-> evidence resolution + delta interpretation. The stitch (design.md
   §1) depends on resolving a claim's evidenceRefs to concrete items and back.
   ========================================================================== */

/** Resolve one evidence ref to its item within a snapshot (undefined if absent). */
export function resolveRef(
  snapshot: EvidenceSnapshot,
  ref: EvidenceRef,
): EvidenceItem | undefined {
  if (ref.snapshotId !== snapshot.id) return undefined;
  return snapshot.items.find((i) => i.id === ref.itemId);
}

/** All items a claim cites, in ref order. */
export function itemsForClaim(
  snapshot: EvidenceSnapshot,
  claim: Claim,
): EvidenceItem[] {
  return claim.evidenceRefs
    .map((ref) => resolveRef(snapshot, ref))
    .filter((i): i is EvidenceItem => Boolean(i));
}

/** Reverse stitch: which claims does a given evidence item support? */
export function claimsForItem(claims: Claim[], itemId: string): Claim[] {
  return claims.filter((c) =>
    c.evidenceRefs.some((ref) => ref.itemId === itemId),
  );
}

export type DeltaTone = "good" | "bad" | "neutral";

/** Interpret a delta by MEANING for the client, not by sign (design.md §2).
 *  Uses the item's polarity override, else config.deltaPolarity by metric. */
export function deltaTone(item: EvidenceItem): DeltaTone {
  if (item.deltaPct == null || item.deltaPct === 0) return "neutral";
  const polarity =
    item.polarity ??
    (item.metricKey
      ? config.deltaPolarity[item.metricKey as MetricKey]
      : "neutral");
  if (polarity === "neutral") return "neutral";
  const improving =
    polarity === "higher_is_better" ? item.deltaPct > 0 : item.deltaPct < 0;
  return improving ? "good" : "bad";
}

/** Direction of the delta arrow, independent of good/bad. */
export function deltaDirection(item: EvidenceItem): "up" | "down" | "flat" {
  if (item.deltaPct == null || item.deltaPct === 0) return "flat";
  return item.deltaPct > 0 ? "up" : "down";
}

/** Semantic text-color class for a delta tone. Positive deltas use the
 *  evidence-system accent (verdigris); negatives use the negative token. */
export function deltaToneClass(tone: DeltaTone): string {
  switch (tone) {
    case "good":
      return "text-verdigris";
    case "bad":
      return "text-negative";
    default:
      return "text-ink-soft";
  }
}

// --- Tone formatting (design.md §4.3 footer bar) -----------------------------

export type Tone = "email" | "slack";

const sortedClaims = (n: Narrative): Claim[] =>
  [...n.claims].sort((a, b) => a.order - b.order);

/** Strip the seed's visual "→ " prefix from plan sentences for copy output. */
const planText = (text: string): string => text.replace(/^→\s*/, "");

/** Email variant: greeting + full paragraphs + sign-off. The full read. */
export function formatEmail(narrative: Narrative): string {
  const body = sortedClaims(narrative)
    .map((c) => (c.kind === "plan" ? `Next: ${planText(c.text)}` : c.text))
    .join("\n\n");
  const greeting = narrative.emailGreeting ?? "Hi,";
  const { emailSignoff, signature } = config.copy.splitView;
  return `${greeting}\n\n${body}\n\n${emailSignoff}\n\n${signature}`;
}

/** Slack variant: the authored condensed copy when present (seeded; Phase 8
 *  regenerates). Fallback: deterministic condensation in the shape the
 *  Narrative Nav's Slack preview draws (node 545:4566) — a header line, one
 *  "• " bullet per fact clipped to its first two em-dash segments, and the
 *  plan as a bare closing line. Naive by design and documented as such; it
 *  guarantees the output is genuinely shorter, never the email re-pasted. */
export function formatSlack(narrative: Narrative, clientName: string): string {
  if (narrative.slackVariant) return narrative.slackVariant;
  const lines = sortedClaims(narrative).map((c) => {
    if (c.kind === "plan") return planText(c.text);
    const segments = c.text.split(" — ");
    const clipped = segments.slice(0, 2).join(" — ").replace(/[,;]\s*$/, "");
    return `• ${clipped.endsWith(".") ? clipped.slice(0, -1) : clipped}`;
  });
  return [
    `${clientName} — ${narrative.week.label ?? narrative.week.start}`,
    "",
    ...lines,
  ].join("\n");
}

export function formatForTone(
  tone: Tone,
  narrative: Narrative,
  clientName: string,
): string {
  return tone === "email"
    ? formatEmail(narrative)
    : formatSlack(narrative, clientName);
}
