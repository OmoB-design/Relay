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
  const [profile, clients] = await Promise.all([
    requireProfile(),
    getClients(),
  ]);
  const isAdmin = profile.role === "admin";
  const newTeamJoins = isAdmin ? await countNewTeamJoins(profile.id) : 0;
  const selected = clients.find((c) => c.id === searchParams.client);

  /* The rail is FLAT: one row per conversation, newest first — the chat is
     universal, so no client owns it. ?chat= reopens one with its transcript. */
  const chats = await listDeskChats(profile.id);
  const openChat = searchParams.chat
    ? await getDeskChat(searchParams.chat, profile.id)
    : null;
  const openMessages = openChat
    ? await getDeskChatMessages(openChat.id)
    : null;

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
