import { CatalogueHeader, Group, Spec } from "@/app/design/_ui";
import { config } from "@/lib/config";
import { ClientsGlyph } from "@/components/relay/NavIcons";
import { EmptyPanel } from "@/components/relay/EmptyPanel";
import { SectionHeader } from "@/components/relay/SectionHeader";
import { ClientList } from "@/components/relay/ClientList";
import { clientProfiles } from "@/lib/seed";

/* Clients — page-level states.
   Separate from today/ because they are separate frames and separate pages;
   one catalogue route per section keeps a slug findable by the name of the
   screen it belongs to. */

const t = config.copy.clientsPage;

export default function ClientStatesPage() {
  return (
    <div className="flex flex-col gap-10">
      <CatalogueHeader title="Clients — page states" count="2 states">
        What /clients renders, by what the reader has. Slugs match the Figma
        frame names so a change can be pointed at by id rather than described.
      </CatalogueHeader>

      <Group
        id="page"
        title="Page assemblies"
        blurb="The whole column inside the sheet, not a component in isolation — the geometry between the header and what follows is part of the design."
      >
        <Spec
          id="clients/first-run-buyer"
          title="First run, as a BUYER — nothing assigned (node 447:2573)"
          when="A buyer whose admin has not assigned them anything. No CTA, because there is nothing they can do about it themselves — the sentence names who can."
          note="Same headline as today/first-run-buyer and deliberately a different body: Today promises yesterday's numbers, this promises the list. One shared string would make one of the two pages lie."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
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
        </Spec>

        <Spec
          id="clients/list-buyer"
          title="The list (node 417:3381)"
          when="One row per client the reader carries: name, then cadence · channel · descriptor. The descriptor is the only part that can run long, so it takes the remaining width and truncates."
          note="Hover a row: the frame changes the CHEVRON and nothing else — #777777 at rest, #050505 hovered — so no background wash was invented for it."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <SectionHeader title={t.title} subline={t.subline}>
              <ClientList clients={clientProfiles} />
            </SectionHeader>
          </div>
        </Spec>
      </Group>
    </div>
  );
}
