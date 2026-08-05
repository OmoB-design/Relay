import { cn } from "@/lib/utils";
import type { AccountHealth, ClientProfile } from "@/lib/types";

/* The portfolio's health, in one line and one meter — Figma node 366:4215, the
   `page-header / health metric` variant.

   ONE SEGMENT PER CLIENT, tinted by that client's health. The frame draws three
   green bars beside "Superb metric health · All 3 client account", which fixes
   the shape but only shows the everything-is-fine case. The rest of the ladder is
   inferred, and it is inferred conservatively: a single red client outranks any
   number of green ones, because the headline exists to tell you whether to look.

     every client green      Superb metric health
     any client red          Needs your attention
     otherwise (some amber)  Holding steady

   A CLIENT IS AS HEALTHY AS ITS WORST ACCOUNT. Health lives per account and a
   client can carry several, so aggregating by the best one would let a broken
   account hide behind a working one — which is the opposite of what a health
   indicator is for.

   Sub-line grammar departs from the frame: it reads "All 3 client accounts", not
   "All 3 client account". */

const TONE: Record<AccountHealth, string> = {
  green: "bg-green-500",
  amber: "bg-yellow-600",
  red: "bg-red-500",
};

/** Worst health across a client's accounts. No accounts is not "healthy" — it is
 *  nothing to report, so it reads as amber rather than green. */
export function healthOf(client: Pick<ClientProfile, "accounts">): AccountHealth {
  const healths = client.accounts.map((a) => a.health);
  if (healths.length === 0) return "amber";
  if (healths.includes("red")) return "red";
  if (healths.includes("amber")) return "amber";
  return "green";
}

export function HealthCard({
  clients,
  className,
}: {
  clients: Pick<ClientProfile, "id" | "name" | "accounts">[];
  className?: string;
}) {
  if (clients.length === 0) return null;

  const healths = clients.map((c) => ({ id: c.id, name: c.name, health: healthOf(c) }));
  const reds = healths.filter((h) => h.health === "red").length;
  const greens = healths.filter((h) => h.health === "green").length;

  const headline =
    reds > 0
      ? "Needs your attention"
      : greens === healths.length
        ? "Superb metric health"
        : "Holding steady";

  const plural = healths.length === 1 ? "account" : "accounts";
  const subline =
    greens === healths.length
      ? `All ${healths.length} client ${plural}`
      : `${greens} of ${healths.length} client ${plural} healthy`;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2.5 rounded-18 border-fig border-border p-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="font-geist text-fig-body fig-medium text-heading-02">
          {headline}
        </p>
        <p className="font-geist text-fig-caption-1 text-heading-06">{subline}</p>
      </div>

      {/* One segment per client. Named for assistive tech, since colour is the
          only thing carrying the per-client reading. */}
      <div
        role="img"
        aria-label={healths
          .map((h) => `${h.name}: ${h.health}`)
          .join(", ")}
        className="flex min-w-0 max-w-health-meter flex-1 items-center gap-1"
      >
        {healths.map((h) => (
          <span
            key={h.id}
            className={cn(
              "h-health-bar min-w-px flex-1 rounded-8",
              TONE[h.health],
            )}
          />
        ))}
      </div>
    </div>
  );
}
