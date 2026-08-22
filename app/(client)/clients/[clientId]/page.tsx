import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { config } from "@/lib/config";
import {
  getAnswerThreadsByIds,
  getClientProfile,
  getDailyRowsForClient,
  getLoomNarrativeIds,
  getNarrativesForClient,
  getSnapshotsByIds,
  getTimeline,
} from "@/lib/data";
import { ClientPageHeader } from "@/components/relay/ClientPageHeader";
import { WorkspaceTabs } from "@/components/relay/WorkspaceTabs";

/* Client workspace — Figma node 417:3401 (`Client/profile/buyer`).
 *
 *  The first page in the redesign wider than the sheet: an 800 column against
 *  Today's and Clients' 550, because the Profile tab runs two 392 columns.
 *  Same sheet geometry otherwise — 32px of headroom, the column opening 64px
 *  below, 18px from the header block to the tab bar.
 *
 *  ?tab=narratives deep-links, as before. */

export const dynamic = "force-dynamic";

const TABS = ["profile", "numbers", "timeline", "narratives"];

export default async function ClientWorkspacePage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { tab?: string };
}) {
  const me = await requireProfile();
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
  const threadIds = Array.from(
    new Set(
      timeline
        .filter((e) => e.type === "answer")
        .map((e) => e.refId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const [snapshots, answerThreads] = await Promise.all([
    getSnapshotsByIds(snapshotIds),
    getAnswerThreadsByIds(threadIds),
  ]);

  return (
    <div className="flex flex-col items-center px-5 md:px-6 pt-8">
      <div className="flex w-full max-w-profile flex-col pb-8 pt-16">
        <ClientPageHeader client={profile} />

        {/* The frame's 18px between the header block and the tab bar. */}
        <div className="mt-4.5 w-full">
          <WorkspaceTabs
            profile={profile}
            timeline={timeline}
            snapshots={snapshots}
            answerThreads={answerThreads}
            narratives={narratives}
            dailyRows={dailyRows}
            loomNarrativeIds={loomNarrativeIds}
            isAdmin={me.role === "admin"}
            defaultTab={
              TABS.includes(searchParams.tab ?? "") ? searchParams.tab : "profile"
            }
          />
        </div>
      </div>
    </div>
  );
}
