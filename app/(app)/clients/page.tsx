import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatCadenceLine } from "@/lib/config";
import { getClients } from "@/lib/data";
import { HealthDot } from "@/components/relay/HealthDot";
import { EmptyState } from "@/components/relay/EmptyState";

// Reads live data — always render fresh (edits to cadence/channel show here).
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <h1 className="mb-6 font-display text-28 text-ink">Clients</h1>

      {clients.length === 0 ? (
        <EmptyState title="No clients connected yet">
          Connect a client to start tracking their story.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-16 text-ink">
                      {c.name}
                    </span>
                    {c.accounts.map((a) => (
                      <HealthDot
                        key={a.id}
                        health={a.health}
                        label={`${a.platform} ${a.externalId}: ${a.health}`}
                      />
                    ))}
                  </span>
                  <span className="block font-ui text-13 text-ink-soft">
                    {formatCadenceLine(c.cadence, c.channel)}
                    {c.descriptor ? ` · ${c.descriptor}` : ""}
                  </span>
                </span>
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-ink-soft"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
