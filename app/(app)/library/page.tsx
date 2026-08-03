import { getClients, getLibraryArtifacts, getSnapshotsByIds } from "@/lib/data";
import { LibraryBrowser } from "@/components/relay/LibraryBrowser";

// Live archive across all clients — always render fresh.
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const [artifacts, clients] = await Promise.all([
    getLibraryArtifacts(),
    getClients(),
  ]);
  const snapshotIds = Array.from(
    new Set(
      artifacts
        .map((a) => a.snapshotId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const snapshots = await getSnapshotsByIds(snapshotIds);

  return (
    <LibraryBrowser
      artifacts={artifacts}
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      snapshots={snapshots}
    />
  );
}
