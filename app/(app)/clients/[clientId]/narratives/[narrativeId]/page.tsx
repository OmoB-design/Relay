import { notFound } from "next/navigation";
import { getNarrativeContext } from "@/lib/data";
import { NarrativeSplitView } from "@/components/relay/NarrativeSplitView";

export default async function NarrativePage({
  params,
}: {
  params: { clientId: string; narrativeId: string };
}) {
  const context = await getNarrativeContext(params.narrativeId);
  if (!context || context.profile.id !== params.clientId) notFound();

  return <NarrativeSplitView context={context} />;
}
