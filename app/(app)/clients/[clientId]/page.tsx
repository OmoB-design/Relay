import { notFound } from "next/navigation";
import { config, formatCadenceLine } from "@/lib/config";
import {
  getClientProfile,
  getDailyRowsForClient,
  getLoomNarrativeIds,
  getNarrativesForClient,
  getSnapshotsByIds,
  getTimeline,
} from "@/lib/data";
import { HealthDot } from "@/components/relay/HealthDot";
import { WorkspaceTabs } from "@/components/relay/WorkspaceTabs";

/* Client workspace (design.md §4.2): header with name, per-account health
   dots, cadence + channel line; tabs below. ?tab=narratives deep-links. */

const TABS = ["profile", "numbers", "timeline", "narratives"];

export default async function ClientWorkspacePage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { tab?: string };
}) {
  const profile = await getClientProfile(params.clientId);
  if (!profile) notFound();

  const [timeline, narratives, loomNarrativeIds, dailyRows] = await Promise.all([
    getTimeline(profile.id),
    getNarrativesForClient(profile.id),
    getLoomNarrativeIds(profile.id),
    getDailyRowsForClient(profile.id, config.daily.numbersWindowDays),
  ]);
  const snapshotIds = Array.from(
    new Set(
      timeline
        .map((e) => e.snapshotId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const snapshots = await getSnapshotsByIds(snapshotIds);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-28 text-ink">{profile.name}</h1>
          <span className="flex items-center gap-1.5">
            {profile.accounts.map((a) => (
              <HealthDot
                key={a.id}
                health={a.health}
                label={`${a.platform} ${a.externalId}: ${a.health}`}
              />
            ))}
          </span>
        </div>
        <p className="mt-1 font-ui text-13 text-ink-soft">
          {formatCadenceLine(profile.cadence, profile.channel)}
          {profile.descriptor ? ` · ${profile.descriptor}` : ""}
          {` · Source of truth: ${profile.sourceOfTruth}`}
        </p>
      </header>

      <WorkspaceTabs
        profile={profile}
        timeline={timeline}
        snapshots={snapshots}
        narratives={narratives}
        dailyRows={dailyRows}
        loomNarrativeIds={loomNarrativeIds}
        defaultTab={
          TABS.includes(searchParams.tab ?? "") ? searchParams.tab : "profile"
        }
      />
    </div>
  );
}
