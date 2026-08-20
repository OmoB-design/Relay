import { firstName, requireProfile } from "@/lib/auth";
import { getClients, getThreadsForClient } from "@/lib/data";
import { AnswerDesk } from "@/components/relay/AnswerDesk";
import { countNewTeamJoins } from "@/lib/team";

// Live data + per-request scope param — always render fresh.
export const dynamic = "force-dynamic";

export default async function AnswerDeskPage({
  searchParams,
}: {
  searchParams: { client?: string };
}) {
  const [profile, clients] = await Promise.all([
    requireProfile(),
    getClients(),
  ]);
  const isAdmin = profile.role === "admin";
  const newTeamJoins = isAdmin ? await countNewTeamJoins(profile.id) : 0;
  const selected = clients.find((c) => c.id === searchParams.client);
  const threads = selected ? await getThreadsForClient(selected.id) : [];

  return (
    <AnswerDesk
      profile={profile}
      isAdmin={isAdmin}
      newTeamJoins={newTeamJoins}
      greetName={firstName(profile)}
      clients={clients.map((c) => ({
        id: c.id,
        name: c.name,
        descriptor: c.descriptor,
        logoUrl: c.logoUrl,
      }))}
      initialClientId={selected?.id}
      initialThreads={threads}
    />
  );
}
