import Link from "next/link";
import { config, formatCadenceLine } from "@/lib/config";
import type { ClientProfile, Narrative } from "@/lib/types";
import { StatusWord } from "@/components/relay/StatusMark";
import { Button } from "@/components/ui/button";

/* One row of Today's "Due this week": who, what cadence, which week, where it
   is in the pipeline, and the single next action.

   Extracted from Today so the state catalogue renders the real component
   rather than a copy of its markup — a replica would drift the first time
   either one changed. */

export type DueClient = Pick<
  ClientProfile,
  "id" | "name" | "cadence" | "channel"
>;

export function DueRow({
  narrative,
  client,
}: {
  narrative: Narrative;
  client: DueClient;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <Link
          href={`/clients/${client.id}`}
          className="font-geist text-fig-body text-heading-01 hover:text-blue-500"
        >
          {client.name}
        </Link>
        <span className="block font-geist text-fig-caption-1 text-heading-06">
          {formatCadenceLine(client.cadence, client.channel)} ·{" "}
          {narrative.week.label}
        </span>
      </span>
      <span className="flex items-center gap-3">
        <StatusWord status={narrative.status} />
        {/* A sent narrative is done — its action drops to secondary weight. */}
        <Button
          asChild
          size="sm"
          variant={narrative.status === "sent" ? "outline" : "default"}
        >
          <Link href={`/clients/${client.id}/narratives/${narrative.id}`}>
            {config.copy.actionByStatus[narrative.status]}
          </Link>
        </Button>
      </span>
    </li>
  );
}
