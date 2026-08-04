"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";
import { config } from "@/lib/config";
import type {
  ClientProfile,
  EvidenceSnapshot,
  DailyRow,
  Narrative,
  TimelineEntry,
} from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/relay/EmptyState";
import { HealthDot } from "@/components/relay/HealthDot";
import { KpiList } from "@/components/relay/KpiList";
import { SensitivityEditor } from "@/components/relay/SensitivityEditor";
import { CommsControls } from "@/components/relay/CommsControls";
import { StakeholderList } from "@/components/relay/StakeholderList";
import { TimelineFeed } from "@/components/relay/TimelineFeed";
import { StatusWord } from "@/components/relay/StatusMark";
import { NumbersTab } from "@/components/relay/NumbersTab";

/* The workspace body: Profile / Timeline / Narratives tabs (design.md §4.2).
   Narratives is a Phase 3 stub. Profile is the Client Graph, two-column on
   desktop, stacked on mobile. */

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <h3 className="border-b border-line px-4 py-2.5 font-ui text-13 uppercase tracking-wide text-ink-soft">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function WorkspaceTabs({
  profile,
  timeline,
  snapshots,
  narratives,
  dailyRows,
  loomNarrativeIds = [],
  defaultTab = "profile",
}: {
  profile: ClientProfile;
  timeline: TimelineEntry[];
  snapshots: Record<string, EvidenceSnapshot>;
  narratives: Narrative[];
  dailyRows: DailyRow[];
  loomNarrativeIds?: string[];
  defaultTab?: string;
}) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="numbers">Numbers</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="narratives">Narratives</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Card title="Connected accounts">
            <ul className="divide-y divide-line">
              {profile.accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-line bg-paper px-2 py-0.5 font-ui text-12 text-ink-soft">
                      {a.platform}
                    </span>
                    <span className="font-ui text-14 text-ink">
                      {a.externalId}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 font-ui text-12 text-ink-soft">
                    <HealthDot health={a.health} />
                    last sync {format(parseISO(a.lastSyncAt), "MMM d")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="KPIs — in the client's language">
            <KpiList kpis={profile.kpis} clientId={profile.id} />
          </Card>

          <Card title="Sensitivities">
            <SensitivityEditor
              sensitivities={profile.sensitivities}
              clientId={profile.id}
            />
          </Card>

          <Card title="Cadence & channel">
            <CommsControls
              clientId={profile.id}
              cadence={profile.cadence}
              channel={profile.channel}
            />
          </Card>

          <Card title="Stakeholders">
            <StakeholderList
              stakeholders={profile.stakeholders}
              clientId={profile.id}
            />
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="numbers" className="mt-4">
        <NumbersTab profile={profile} rows={dailyRows} />
      </TabsContent>

      <TabsContent value="timeline" className="mt-4">
        <TimelineFeed entries={timeline} snapshots={snapshots} />
      </TabsContent>

      <TabsContent value="narratives" className="mt-4">
        {narratives.length === 0 ? (
          <EmptyState title="No narratives yet">
            Weekly drafts will land here, every claim stitched to its evidence.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {narratives.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0">
                  <Link
                    href={`/clients/${profile.id}/narratives/${n.id}`}
                    className="block font-display text-16 text-ink hover:text-verdigris"
                  >
                    Weekly commentary · {n.week.label}
                  </Link>
                  <span className="flex flex-wrap items-center gap-x-2 font-ui text-13 text-ink-soft">
                    {n.claims.length} claims ·{" "}
                    {config.copy.channelLabel[n.channel]}
                    {loomNarrativeIds.includes(n.id) && (
                      <Link
                        href={`/clients/${profile.id}/narratives/${n.id}/loom`}
                        className="inline-flex items-center rounded-full border border-line bg-paper px-2 py-0.5 font-ui text-12 text-verdigris hover:bg-verdigris-wash"
                      >
                        {config.copy.loom.openBrief}
                      </Link>
                    )}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <StatusWord status={n.status} />
                  <Link
                    href={`/clients/${profile.id}/narratives/${n.id}`}
                    aria-label={`Open ${n.week.label}`}
                  >
                    <ChevronRight
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-ink-soft"
                    />
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
