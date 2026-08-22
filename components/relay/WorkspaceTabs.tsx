"use client";

import { format, parseISO } from "date-fns";
import { config } from "@/lib/config";
import type {
  AnswerThread,
  ClientProfile,
  EvidenceSnapshot,
  DailyRow,
  Narrative,
  TimelineEntry,
} from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { HealthDot } from "@/components/relay/HealthDot";
import {
  ProfileCard,
  ProfileWell,
} from "@/components/relay/ProfileCard";
import { KpiList } from "@/components/relay/KpiList";
import { SensitivityEditor } from "@/components/relay/SensitivityEditor";
import { CommsControls } from "@/components/relay/CommsControls";
import { StakeholderList } from "@/components/relay/StakeholderList";
import { TimelineBlock } from "@/components/relay/TimelineBlock";
import {
  NarrativeEmpty,
  NarrativeList,
  NarrativeRow,
} from "@/components/relay/NarrativeRow";
import { NumbersTab } from "@/components/relay/NumbersTab";
import { LogoControl } from "@/components/relay/LogoControl";

/* The workspace body — restyled to node 417:3401 (`Client/profile/buyer`).

   THE TAB BAR is the frame's: 13px Body-MD labels at 32px gaps on a hairline
   rule, the active one in Heading-01 with a 2px Blue/500 underline sitting ON
   the rule, resting ones in Heading-06. Radix Tabs still owns the state and
   the ?tab= deep link contract; only the clothes changed.

   THE PROFILE TAB is the frame's two columns: left = accounts, sensitivities,
   cadence & channel, logo; right = KPIs, stakeholders. Every card is a
   ProfileCard — the label-on-wash shell — and the old private Card (a legacy
   rounded-lg box every one of these inherited) is gone with it. */

const TAB_TRIGGER = cn(
  /* Reset the shadcn pill treatment entirely — the frame's tab is text, a gap,
     and an underline, not a filled control.

     -mb-px is the standard active-indicator trick (Radix/M3 both do it): the
     bar's rule is the LIST's bottom border, so the trigger dips one pixel into
     it and the indicator, drawn at the trigger's own bottom edge, lands ON the
     rule instead of beneath it. */
  "relative -mb-px h-auto flex-none rounded-none border-0 px-0 py-3",
  "font-geist text-fig-body fig-w450 text-heading-06",
  "data-[state=active]:bg-transparent data-[state=active]:text-heading-01 data-[state=active]:shadow-none",
  /* The 2px Blue/500 underline (node 422:5959), riding the bar's hairline. */
  "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t-2 after:bg-blue-500 after:opacity-0 after:transition-opacity",
  "data-[state=active]:after:opacity-100",
)

export function WorkspaceTabs({
  profile,
  timeline,
  snapshots,
  answerThreads = {},
  narratives,
  dailyRows,
  loomNarrativeIds = [],
  defaultTab = "profile",
  isAdmin = false,
}: {
  profile: ClientProfile;
  timeline: TimelineEntry[];
  snapshots: Record<string, EvidenceSnapshot>;
  /** Keyed by thread id — the timeline's answer rows replay the question. */
  answerThreads?: Record<string, AnswerThread>;
  narratives: Narrative[];
  dailyRows: DailyRow[];
  loomNarrativeIds?: string[];
  defaultTab?: string;
  /** Gates the admin-only cards. Server-side checks stand regardless. */
  isAdmin?: boolean;
}) {
  return (
    <Tabs defaultValue={defaultTab}>
      {/* One hairline under the whole bar; each active tab paints its 2px on
          top of it. gap-8 is the frame's 32. */}
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-8 rounded-none border-b-0 p-0 pt-1 divider-b border-border"
      >
        <TabsTrigger className={TAB_TRIGGER} value="profile">
          Profile
        </TabsTrigger>
        <TabsTrigger className={TAB_TRIGGER} value="numbers">
          Numbers
        </TabsTrigger>
        <TabsTrigger className={TAB_TRIGGER} value="timeline">
          Timeline
        </TabsTrigger>
        <TabsTrigger className={TAB_TRIGGER} value="narratives">
          Narratives
        </TabsTrigger>
      </TabsList>

      {/* 48px from the bar to the columns (the frame's 139 -> 187). */}
      <TabsContent value="profile" className="mt-12">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* LEFT (node 425:6793): accounts, sensitivities, cadence, logo. */}
          <div className="flex min-w-0 flex-col gap-4">
            <ProfileCard label={config.copy.accountsTitle}>
              <ProfileWell last>
                <ul>
                  {profile.accounts.map((a, i) => (
                    <li
                      key={a.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 px-2 py-3",
                        i > 0 && "divider-t border-border",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="inline-flex shrink-0 items-center rounded-full border-fig border-border bg-surface-foreground-01 px-1.5 py-1 font-geist text-fig-caption-1 text-heading-05">
                          {a.platform}
                        </span>
                        <span className="truncate font-geist text-fig-body fig-w450 text-heading-01">
                          {a.externalId}
                        </span>
                      </span>
                      {/* The health dot is not in the frame; it stays because
                          it is information the app HAS, and a paused account
                          should not look identical to a healthy one. */}
                      <span className="flex shrink-0 items-center gap-1.5 font-geist text-fig-body fig-w450 text-heading-06">
                        <HealthDot health={a.health} />
                        Last sync: {format(parseISO(a.lastSyncAt), "MMM d")}
                      </span>
                    </li>
                  ))}
                </ul>
              </ProfileWell>
            </ProfileCard>

            <ProfileCard label={config.copy.sensitivitiesTitle}>
              <SensitivityEditor
                sensitivities={profile.sensitivities}
                clientId={profile.id}
              />
            </ProfileCard>

            <ProfileCard label={config.copy.cadenceTitle}>
              <CommsControls
                clientId={profile.id}
                cadence={profile.cadence}
                channel={profile.channel}
                timezone={profile.accountTimezone}
              />
            </ProfileCard>

            {/* Admins only. A buyer has no reason to decide what a client's
                mark looks like, and the actions refuse them server-side. */}
            {isAdmin && (
              <ProfileCard label={config.copy.logo.title}>
                <LogoControl
                  clientId={profile.id}
                  clientName={profile.name}
                  logoUrl={profile.logoUrl}
                  logoSource={profile.logoSource}
                  logoError={profile.logoError}
                  domain={profile.domain}
                />
              </ProfileCard>
            )}
          </div>

          {/* RIGHT (node 422:6551): KPIs, stakeholders. */}
          <div className="flex min-w-0 flex-col gap-4">
            <ProfileCard label={config.copy.kpisTitle}>
              <KpiList kpis={profile.kpis} clientId={profile.id} />
            </ProfileCard>

            <ProfileCard label={config.copy.stakeholdersTitle}>
              <StakeholderList
                stakeholders={profile.stakeholders}
                clientId={profile.id}
              />
            </ProfileCard>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="numbers" className="mt-12">
        <NumbersTab profile={profile} rows={dailyRows} />
      </TabsContent>

      <TabsContent value="timeline" className="mt-12">
        <TimelineBlock
          entries={timeline}
          snapshots={snapshots}
          threads={answerThreads}
        />
      </TabsContent>

      <TabsContent value="narratives" className="mt-12">
        {narratives.length === 0 ? (
          <NarrativeEmpty />
        ) : (
          <NarrativeList>
            {narratives.map((n) => (
              <NarrativeRow
                key={n.id}
                narrative={n}
                clientId={profile.id}
                hasLoom={loomNarrativeIds.includes(n.id)}
              />
            ))}
          </NarrativeList>
        )}
      </TabsContent>
    </Tabs>
  );
}
