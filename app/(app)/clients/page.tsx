import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { config, formatCadenceLine } from "@/lib/config";
import { getClients } from "@/lib/data";
import { HealthDot } from "@/components/relay/HealthDot";
import { EmptyPanel } from "@/components/relay/EmptyPanel";
import { ClientsGlyph } from "@/components/relay/NavIcons";
import { SectionHeader } from "@/components/relay/SectionHeader";

/* Clients — Figma node 447:2573 (`Client/First run - buyer`).
 *
 *  The EMPTY state is the frame that exists, so that is what is built to
 *  measure: the 550 column inside the sheet, a 23px title with its line, 48px
 *  of air, and the same dashed panel Today's first run uses.
 *
 *  The populated list below is UNCHANGED and still on the legacy scale. There
 *  is no frame for it yet, and inventing one would mean guessing at a design
 *  that is coming — then having to unpick the guess. It is reached only once an
 *  admin has assigned a client, which is exactly the state the next frame will
 *  describe. */

// Reads live data — always render fresh (edits to cadence/channel show here).
export const dynamic = "force-dynamic";

const t = config.copy.clientsPage;

export default async function ClientsPage() {
  const clients = await getClients();

  if (clients.length === 0) {
    /* The column geometry is Today's, because it is the same sheet: 32px of
       headroom from the sheet's own padding, the 550 column opening 64px below
       it. px-6 never bites at 550 — it is the guard for a narrow viewport. */
    return (
      <div className="flex flex-col items-center px-6 pt-8">
        <div className="flex w-full max-w-sheet flex-col gap-16 pb-8 pt-16">
          <SectionHeader title={t.title} subline={t.subline}>
            <EmptyPanel
              title={t.empty}
              glyph={
                <ClientsGlyph className="size-nav-icon text-icon-explainer" />
              }
            >
              {t.emptyBody}
            </EmptyPanel>
          </SectionHeader>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <h1 className="mb-6 font-display text-28 text-ink">{t.title}</h1>

      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {clients.map((c) => (
          <li key={c.id}>
            <Link
              href={`/clients/${c.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-display text-16 text-ink">{c.name}</span>
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
    </div>
  );
}
