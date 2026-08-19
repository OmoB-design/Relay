import { firstName, requireProfile } from "@/lib/auth";
import { getClients, getSnapshotsByIds, getThreadsForClient } from "@/lib/data";
import { AnswerDesk } from "@/components/relay/AnswerDesk";
import type { AnswerThread } from "@/lib/types";

// Live data + per-request scope param — always render fresh.
export const dynamic = "force-dynamic";

function snapshotIdsFrom(threads: AnswerThread[]): string[] {
  return Array.from(
    new Set(
      threads.flatMap((t) => t.answer?.evidenceRefs.map((r) => r.snapshotId) ?? []),
    ),
  );
}

export default async function AnswerDeskPage({
  searchParams,
}: {
  searchParams: { client?: string };
}) {
  const [profile, clients] = await Promise.all([
    requireProfile(),
    getClients(),
  ]);
  const selected = clients.find((c) => c.id === searchParams.client);

  const threads = selected ? await getThreadsForClient(selected.id) : [];
  const snapshots = selected
    ? await getSnapshotsByIds(snapshotIdsFrom(threads))
    : {};

  return (
    <AnswerDesk
      greetName={firstName(profile)}
      clients={clients.map((c) => ({
        id: c.id,
        name: c.name,
        descriptor: c.descriptor,
        logoUrl: c.logoUrl,
      }))}
      selectedClientId={selected?.id}
      threads={threads}
      snapshots={snapshots}
    />
  );
}
