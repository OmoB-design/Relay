import Link from "next/link";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { Narrative, NarrativeStatus } from "@/lib/types";
import {
  ChevronGlyph,
  GmailGlyph,
  SlackGlyph,
} from "@/components/relay/NavIcons";
import { EmptyState } from "@/components/relay/EmptyState";

/* ============================================================================
   The client workspace Narratives tab (Figma 506:4919) — the index a buyer
   scans before opening the claim↔evidence detail. The list is the evidence
   rail's shell — a Dashboard wash, rounded-18, "Narratives" written on the
   4px frame — and every narrative is its own white rounded-14 card: title ·
   week on the first line, the claims pill · channel mark · (Loom brief pill)
   on the second, the status pill and the row chevron on the right. The whole
   card opens the week; the Loom pill alone goes to the brief.

   Extracted from WorkspaceTabs so the design catalogue can render the real row
   in every variant (drafted / reviewed / sent · loom / no-loom · slack / email
   · empty) — the props stay a Narrative, its client id, and hasLoom.
   ========================================================================== */

/** The status pill (12px, unlike the side panel's 10): Sent and Reviewed are
 *  tinted with their 50-wash and 100-stroke; Drafted sits quietly on
 *  Foreground-01, borderless and a step wider (592:6340). */
const STATUS_PILL: Record<NarrativeStatus, string> = {
  drafted: "border-transparent bg-surface-foreground-01 px-2 text-heading-05",
  reviewed: "border-blue-100 bg-blue-50 px-1.5 text-blue-500",
  sent: "border-green-100 bg-green-50 px-1.5 text-green-500",
};

const STATUS_WORD: Record<NarrativeStatus, string> = {
  drafted: "Drafted",
  reviewed: "Reviewed",
  sent: "Sent",
};

function Dot() {
  return (
    <span
      aria-hidden="true"
      className="size-dot-md shrink-0 rounded-full bg-grey-200"
    />
  );
}

export function NarrativeRow({
  narrative,
  clientId,
  hasLoom = false,
}: {
  narrative: Narrative;
  clientId: string;
  /** A Loom brief exists for this week → show the brief pill (592:6369). */
  hasLoom?: boolean;
}) {
  const href = `/clients/${clientId}/narratives/${narrative.id}`;
  const claims = narrative.claims.length;

  return (
    <li className="w-full">
      <div className="group relative flex w-full items-center justify-between gap-4 rounded-14 border-fig border-border bg-surface-primary py-2.5 pl-2 pr-3.5">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="flex items-center gap-2">
            {/* The stretched link: the whole card opens the week. */}
            <Link
              href={href}
              className="font-geist text-fig-body fig-w450 text-heading-01 outline-none after:absolute after:inset-0 after:rounded-14 focus-visible:after:ring-1 focus-visible:after:ring-inset focus-visible:after:ring-blue-500"
            >
              Weekly Commentary
            </Link>
            <span className="flex items-center gap-1.5">
              <Dot />
              <span className="font-geist text-fig-caption-1 text-heading-06">
                {narrative.week.label ?? narrative.week.start}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-chip items-center rounded-full border-fig border-border bg-surface-foreground-01 px-1.5 font-geist text-fig-caption-1 text-heading-05 whitespace-nowrap">
              {claims} {claims === 1 ? "claim" : "claims"}
            </span>
            <span className="flex items-center gap-1.5">
              <Dot />
              {narrative.channel === "email" ? (
                <GmailGlyph className="h-3 w-4 shrink-0" />
              ) : (
                <SlackGlyph className="size-3.5 shrink-0" />
              )}
              <span className="font-geist text-fig-caption-1 text-heading-06">
                {config.copy.channelLabel[narrative.channel]}
              </span>
            </span>
            {hasLoom && (
              <Link
                href={`${href}/loom`}
                className="relative z-10 flex h-chip items-center rounded-full bg-pink-50 px-1.5 font-geist text-fig-caption-1 text-heading-03 whitespace-nowrap outline-none hover:text-heading-01 focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                Loom brief
              </Link>
            )}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-5">
          <span
            className={cn(
              "flex h-chip items-center rounded-full border-fig font-geist text-fig-caption-1 whitespace-nowrap",
              STATUS_PILL[narrative.status],
            )}
          >
            {STATUS_WORD[narrative.status]}
          </span>
          {/* Drawn #777777 at rest, darkening with the hovered row — the row
              chevron's own convention (418:5768). */}
          <ChevronGlyph className="shrink-0 text-icon-explainer group-hover:text-heading-01" />
        </span>
      </div>
    </li>
  );
}

/** The list shell (506:4922): the Dashboard wash the rows sit in, the label
 *  written on its 4px frame, rows stacked with the 4px seam. */
export function NarrativeList({ children }: { children: React.ReactNode }) {
  return (
    <section className="w-full rounded-18 border-fig border-border bg-surface-dashboard shadow-card">
      <div className="flex w-full flex-col p-1">
        <div className="flex items-center px-2.5 py-1.5">
          <span className="font-geist text-fig-caption-1 text-heading-06">
            Narratives
          </span>
        </div>
        <ul className="flex w-full flex-col gap-1">{children}</ul>
      </div>
    </section>
  );
}

/** First-run: Relay hasn't drafted a week for this client yet. */
export function NarrativeEmpty() {
  return (
    <EmptyState title="No narratives yet">
      Weekly drafts will land here, every claim stitched to its evidence.
    </EmptyState>
  );
}
