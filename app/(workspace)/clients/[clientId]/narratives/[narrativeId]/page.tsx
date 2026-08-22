import { notFound } from "next/navigation";
import { getNarrativeContext, getNarrativesForClient } from "@/lib/data";
import { NarrativeSideNav } from "@/components/relay/NarrativeSideNav";
import { NarrativeWorkspace } from "@/components/relay/NarrativeWorkspace";

/* The narrative workspace (Figma 506:5375): the narratives panel on the wash
 * beside the nav, then the white sheet carrying the drafted message, its
 * evidence, and the floating action bar. Lives in the (workspace) group — the
 * only route where the sheet starts 300px later than everywhere else. */

export const dynamic = "force-dynamic";

export default async function NarrativePage({
  params,
}: {
  params: { clientId: string; narrativeId: string };
}) {
  const context = await getNarrativeContext(params.narrativeId);
  if (!context || context.profile.id !== params.clientId) notFound();
  const narratives = await getNarrativesForClient(context.profile.id);

  return (
    <div className="flex h-full min-w-0 flex-1">
      <NarrativeSideNav
        profile={context.profile}
        narratives={narratives}
        activeId={context.narrative.id}
      />
      <section className="relative min-w-0 flex-1 overflow-hidden bg-surface-primary md:rounded-l-8 md:border-fig md:border-border-sheet md:shadow-sheet-quiet">
        <NarrativeWorkspace context={context} />
      </section>
    </div>
  );
}
