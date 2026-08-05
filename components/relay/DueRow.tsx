import Link from "next/link";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { ClientProfile, Narrative, NarrativeStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ClientAvatar } from "@/components/relay/ClientAvatar";
import { ClientRing } from "@/components/relay/ClientRing";
import { EditGlyph } from "@/components/relay/NavIcons";

/* ============================================================================
   "Due this week" — Figma node 365:3414, all five variants (all / drafted /
   reviewed / sent / empty).

   THE BIGGEST CHANGE IS STRUCTURAL: each row is now its own radius-20 card with
   16px of air under it, where before they were rows sharing one bordered list.
   Waiting on you keeps the shared-list shape, so the two sections read
   differently on purpose — Waiting is a queue you work down, Due is a set of
   separate pieces of work.

   TWO GREYS ON THE META LINE, and they are both bound to Typography/Heading-06
   in Figma. The cadence is #5a5a5a, the channel and the week are #bfbfbf, and
   the frame's screenshot confirms the difference is real rather than a codegen
   artefact — so the lighter pair map to Grey/Grey 300. See the note in the
   commit about which value that variable should actually hold.

   DEPARTURES:

   1. FLEX. Figma splits the row into two equal halves (`flex 1 0 0` on both), so
      a long client name would truncate at 50% of the row while the button side
      sat half empty. The left side grows and the right stays its content width
      instead; identical when things fit, better when they don't.

   2. HAIRLINES. The frame's 0.5px card border and 0.6px button border both
      resolve to the single 0.7px border-fig, per the one-weight rule. The empty
      state's four concentric shells (dashed 1px, 0.7px dashed, 0.4px, and a 0.5
      divider at the same 18px radius) collapse to one dashed hairline.

   3. THE ARC on the client ring is drawn as designed but its meaning is
      undefined — see the note in ClientRing.
   ========================================================================== */

export type DueClient = Pick<
  ClientProfile,
  "id" | "name" | "cadence" | "channel"
>;

/** Figma's status colours: Caption 1 resting, Blue 400 at the send step, Green
 *  500 done. Note blue-400 not blue-500 — the row's word is a shade lighter than
 *  StatusMark's, which is what the frame draws. */
const STATUS_TONE: Record<NarrativeStatus, string> = {
  drafted: "text-caption-1",
  reviewed: "text-blue-400",
  sent: "text-green-500",
};

/** A 5px dot between meta items, 3px between the status word and the button. */
function Dot({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0 rounded-full bg-grey-200",
        small ? "size-dot-sm" : "size-dot",
      )}
    />
  );
}

export function DueRow({
  narrative,
  client,
  logo,
}: {
  narrative: Narrative;
  client: DueClient;
  /** Path under /public, from config.clientLogos. */
  logo?: string;
}) {
  const sent = narrative.status === "sent";

  return (
    <li className="overflow-hidden rounded-20 border-fig border-border bg-surface-primary">
      <div className="flex items-center gap-2.5 p-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <ClientRing name={client.name} logo={logo} />
          <span className="flex min-w-0 flex-col justify-center gap-1.5">
            <Link
              href={`/clients/${client.id}`}
              className="truncate font-geist text-fig-body fig-w450 text-heading-04 hover:text-blue-500"
            >
              {client.name}
            </Link>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 font-geist text-fig-caption-1 text-heading-06">
                {config.copy.cadenceLabel[client.cadence.primary]}
              </span>
              <Dot />
              <span className="shrink-0 font-geist text-fig-caption-1 text-grey-300">
                {config.copy.channelLabel[client.channel]}
              </span>
              <Dot />
              <span className="truncate font-geist text-fig-caption-1 text-grey-300">
                {narrative.week.label}
              </span>
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5">
          <span
            className={cn(
              "whitespace-nowrap py-1 font-geist text-fig-button fig-medium",
              STATUS_TONE[narrative.status],
            )}
          >
            {config.copy.status[narrative.status]}
          </span>
          <Dot small />
          {/* A sent narrative is done, so its action drops to the outline
              treatment. Figma's label for it is Heading-03 #171717, which is
              heading-02 here — a shade off the outline variant's default black. */}
          <Button
            asChild
            size="fig"
            variant={sent ? "outline" : "default"}
            className={sent ? "text-heading-02" : undefined}
          >
            <Link href={`/clients/${client.id}/narratives/${narrative.id}`}>
              {config.copy.actionByStatus[narrative.status]}
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

/** The rows, each its own card, 16px apart. */
export function DueList({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col gap-4 pt-0.5">{children}</ul>;
}

/** "All caught up" — Figma 365:3311. The client mark's own tile with a pencil in
 *  it, over a dashed hairline. */
export function DueEmpty() {
  return (
    <div className="flex min-h-due-empty flex-col rounded-18 border-fig border-dashed border-border bg-surface-primary p-1 shadow-card">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-14 border-fig border-border bg-surface-dashboard px-2 pb-3 pt-1">
        <div className="flex flex-col items-center justify-center gap-2">
          <ClientAvatar
            name=""
            glyph={<EditGlyph className="size-nav-icon text-caption-1" />}
          />
          <div className="flex flex-col items-center justify-center gap-3">
            <p className="font-geist text-fig-body fig-w450 text-heading-01">
              {config.copy.today.dueEmpty}
            </p>
            <p className="max-w-column text-center font-geist text-fig-caption-1 text-heading-06">
              {config.copy.today.dueEmptyBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
