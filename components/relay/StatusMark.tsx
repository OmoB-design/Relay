import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { Narrative, NarrativeStatus } from "@/lib/types";

/* ============================================================================
   The replacement for StatusStepper — two forms, because the question "where is
   this in the pipeline" is worth different amounts in different places.

   `StatusWord` — for a list row. The row's button already says what to do next
   ("Review draft" / "Send" / "View sent"), so a three-node diagram beside it
   repeats the same information once per row down the page. One word carrying the
   stage in colour is complete, and it follows the palette's own roles:
     drafted   heading-06  nothing has happened yet
     reviewed  blue-500    at the send step — the same blue as the Send button
     sent      green-500   done

   `StatusTimeline` — for the narrative page, where you are acting on this one
   thing. Strictly more than the stepper carried: the stepper told you WHETHER a
   stage had happened, this tells you WHEN, and a missing timestamp is itself the
   "not yet". It also survives the lifecycle growing — "Back to draft" already
   exists, so a narrative can go reviewed → drafted → reviewed, which a
   three-node stepper cannot depict but a timestamp line can.

   PROVISIONAL: this is the recommendation, live, for judging. The designer's own
   treatment supersedes it.
   ========================================================================== */

const TONE: Record<NarrativeStatus, string> = {
  drafted: "text-heading-06",
  reviewed: "text-blue-500",
  sent: "text-green-500",
};

export function StatusWord({
  status,
  className,
}: {
  status: NarrativeStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-geist text-fig-caption-1 whitespace-nowrap",
        TONE[status],
        className,
      )}
    >
      {config.copy.status[status]}
    </span>
  );
}

/** "Drafted 02:00 · Reviewed 07:40 · Not yet sent" */
export function StatusTimeline({
  narrative,
  className,
}: {
  narrative: Pick<Narrative, "status" | "reviewedAt" | "sentAt">;
  className?: string;
}) {
  const at = (iso?: string) =>
    iso ? format(parseISO(iso), "MMM d, HH:mm") : undefined;
  const reviewed = at(narrative.reviewedAt);
  const sent = at(narrative.sentAt);

  const steps: { label: string; done: boolean }[] = [
    // A draft always exists by the time this renders — Relay wrote it.
    { label: config.copy.status.drafted, done: true },
    {
      label: reviewed
        ? `${config.copy.status.reviewed} ${reviewed}`
        : config.copy.statusPending.reviewed,
      done: Boolean(reviewed),
    },
    {
      label: sent
        ? `${config.copy.status.sent} ${sent}`
        : config.copy.statusPending.sent,
      done: Boolean(sent),
    },
  ];

  return (
    <p
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label={`Status: ${config.copy.status[narrative.status]}`}
    >
      {steps.map((s, i) => (
        <span key={s.label} className="flex items-center gap-1.5">
          {i > 0 && (
            <span
              aria-hidden="true"
              className="size-dot-sm shrink-0 rounded-full bg-grey-300"
            />
          )}
          <span
            className={cn(
              "font-geist text-fig-caption-1 whitespace-nowrap",
              s.done ? "text-heading-05" : "text-caption-1",
            )}
          >
            {s.label}
          </span>
        </span>
      ))}
    </p>
  );
}
