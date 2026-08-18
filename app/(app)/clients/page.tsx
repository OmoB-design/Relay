import { config } from "@/lib/config";
import { getClients } from "@/lib/data";
import { ClientList } from "@/components/relay/ClientList";
import { EmptyPanel } from "@/components/relay/EmptyPanel";
import { ClientsGlyph } from "@/components/relay/NavIcons";
import { SectionHeader } from "@/components/relay/SectionHeader";

/* Clients — Figma nodes 447:2573 (`First run - buyer`) and 417:3381 (`List`).
 *
 *  Both frames draw the same page: the 550 column inside the sheet, a 23px
 *  title with its line, 48px of air, then one card. Only the card differs, so
 *  the shell is written once and the branch is the last thing in it. */

// Reads live data — always render fresh (edits to cadence/channel show here).
export const dynamic = "force-dynamic";

const t = config.copy.clientsPage;

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    /* The column geometry is Today's, because it is the same sheet: 32px of
       headroom from the sheet's own padding, the 550 column opening 64px below
       it. px-4 md:px-6 never bites at 550 — it is the guard for a narrow viewport. */
    <div className="flex flex-col items-center px-4 md:px-6 pt-8">
      <div className="flex w-full max-w-sheet flex-col gap-16 pb-8 pt-16">
        <SectionHeader title={t.title} subline={t.subline}>
          {clients.length === 0 ? (
            <EmptyPanel
              title={t.empty}
              glyph={
                <ClientsGlyph className="size-nav-icon text-icon-explainer" />
              }
            >
              {t.emptyBody}
            </EmptyPanel>
          ) : (
            <ClientList clients={clients} />
          )}
        </SectionHeader>
      </div>
    </div>
  );
}
