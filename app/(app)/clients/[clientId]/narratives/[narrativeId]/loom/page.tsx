import { notFound } from "next/navigation";
import { getLoomBriefContext } from "@/lib/data";
import { LoomBriefView } from "@/components/relay/LoomBriefView";

export default async function LoomBriefPage({
  params,
}: {
  params: { clientId: string; narrativeId: string };
}) {
  const context = await getLoomBriefContext(params.narrativeId);
  if (!context || context.profile.id !== params.clientId) notFound();

  return <LoomBriefView context={context} />;
}
