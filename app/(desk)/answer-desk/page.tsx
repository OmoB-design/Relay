import { firstName, requireProfile } from "@/lib/auth";
import {
  getClients,
  getDeskChat,
  getDeskChatMessages,
  listDeskChats,
} from "@/lib/data";
import { AnswerDesk } from "@/components/relay/AnswerDesk";
import { countNewTeamJoins } from "@/lib/team";

// Live data + per-request scope param — always render fresh.
export const dynamic = "force-dynamic";

export default async function AnswerDeskPage({
  searchParams,
}: {
  searchParams: { client?: string; chat?: string };
}) {
  /* ONE serial hop (the profile, deduped with the layout's own call), then
     everything else in a single parallel wave — the desk was five stacked
     round trips and the slowest page in the app before this. The transcript
     is fetched optimistically alongside its ownership check and discarded
     if the check fails; RLS guards it regardless. */
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const [clients, newTeamJoins, chats, openChat, openMessagesRaw] =
    await Promise.all([
      getClients(),
      isAdmin ? countNewTeamJoins(profile.id) : Promise.resolve(0),
      listDeskChats(profile.id),
      searchParams.chat
        ? getDeskChat(searchParams.chat, profile.id)
        : Promise.resolve(null),
      searchParams.chat
        ? getDeskChatMessages(searchParams.chat)
        : Promise.resolve(null),
    ]);
  const selected = clients.find((c) => c.id === searchParams.client);
  const openMessages = openChat ? openMessagesRaw : null;

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
      initialChats={chats}
      initialOpenChatId={openChat?.id ?? null}
      initialOpenMessages={openMessages}
    />
  );
}
