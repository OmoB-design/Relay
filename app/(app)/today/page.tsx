import Link from "next/link";
import { format } from "date-fns";
import { config, formatAge } from "@/lib/config";
import { isPilotClock, now } from "@/lib/clock";
import { firstName, requireProfile } from "@/lib/auth";
import {
  getClients,
  getDueThisWeek,
  getEditableClientIds,
  getLatestDailyRows,
  getOpenFlags,
  getWaitingThreads,
} from "@/lib/data";
import { buildDigest } from "@/lib/daily/digest";
import { logoFor } from "@/lib/logos";
import {
  DailyDigestBand,
  type DigestEntry,
} from "@/components/relay/DailyDigestBand";
import { DueEmpty, DueList, DueRow } from "@/components/relay/DueRow";
import { WaitingList, WaitingRow } from "@/components/relay/WaitingRow";
import { SectionHeading } from "@/components/relay/SectionHeading";
import { ClientsGlyph, WaitingGlyph } from "@/components/relay/NavIcons";
import { EmptyPanel } from "@/components/relay/EmptyPanel";
import { PageHeader } from "@/components/relay/PageHeader";
import { HealthCard } from "@/components/relay/HealthCard";
import { TodayFlagList } from "@/components/relay/TodayFlagList";
import { Button } from "@/components/ui/button";

const t = config.copy.today;

// Reads live data (staged rows, flags, narrative states) on every request.
export const dynamic = "force-dynamic";

function Section({
  title,
  glyph,
  children,
}: {
  title: string;
  glyph?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <h2>
        <SectionHeading title={title} glyph={glyph} />
      </h2>
      {children}
    </section>
  );
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: { empty?: string };
}) {
  const profile = await requireProfile();

  // ?empty=1 forces the first-run view for demos, without touching data.
  const forceEmpty = searchParams.empty === "1";

  const [waiting, flags, due, clients, dailyRows] = forceEmpty
    ? [[], [], [], [], []]
    : await Promise.all([
        getWaitingThreads(),
        getOpenFlags(),
        getDueThisWeek(),
        getClients(),
        getLatestDailyRows(),
      ]);

  // The genuine zero-state: no clients connected at all.
  const showFirstRun = forceEmpty || clients.length === 0;

  /* The morning queue: every client, with yesterday's row or an honest account
     of why it's missing. Shared with the admin overview — two surfaces working
     out "absent" separately is how they come to disagree. */
  const editable = await getEditableClientIds(
    profile,
    clients.map((c) => c.id),
  );
  const digest: DigestEntry[] = buildDigest(clients, dailyRows, editable);

  const today = format(now(), "EEEE, MMMM d");

  /* Node 357:1074's measurements, inside the sheet: the column is centred at
     550, opens 64px below the sheet's own 32px of headroom, and leaves 64px
     between the header block and the first section. */
  return (
    <div className="flex flex-col items-center px-4 md:px-6 pt-8">
      <div className="flex w-full max-w-sheet flex-col gap-16 pb-8 pt-16">
        <PageHeader
          date={today}
          /* The page's accessible name is "Today"; the greeting is the visible
             expression of it, so the nav label and the heading agree. */
          greeting={
            <>
              <span className="sr-only">Today — </span>
              {t.greetingPrefix} {firstName(profile)}.
            </>
          }
          subline={showFirstRun ? t.firstRunSubline : t.greeting}
          variant={showFirstRun ? "first-run" : "week"}
          notice={
            isPilotClock ? (
              <p className="font-geist text-fig-caption-2 text-yellow-700">
                Demo clock — pinned to {today}. Unset RELAY_PILOT_NOW for the
                real date.
              </p>
            ) : undefined
          }
        >
          {showFirstRun ? (
            profile.role === "admin" ? (
              <EmptyPanel
                title={t.emptyTitle}
                glyph={
                  <ClientsGlyph className="size-nav-icon text-icon-explainer" />
                }
                action={
                  <Button asChild size="fig">
                    <Link href="/admin">{t.emptyCta}</Link>
                  </Button>
                }
              >
                {t.emptyBody}
              </EmptyPanel>
            ) : (
              /* A buyer cannot assign themselves a client, so offering them a
                 CTA would be a dead end. Name who can, and stop. */
              <EmptyPanel
                title={config.copy.auth.noClients}
                glyph={
                  <ClientsGlyph className="size-nav-icon text-icon-explainer" />
                }
              >
                {config.copy.auth.noClientsBody}
              </EmptyPanel>
            )
          ) : (
            <HealthCard clients={clients} />
          )}
        </PageHeader>

      {!showFirstRun && (
        <div className="flex flex-col gap-16">
          {/* 0. Yesterday's numbers — the morning ritual, most time-critical. */}
          <DailyDigestBand entries={digest} />

          {/* 1. Waiting on you — collapses entirely when empty, because the
                 absence of urgency is itself information. */}
          {waiting.length > 0 && (
            <Section
              title={t.waitingTitle}
              glyph={<WaitingGlyph className="size-nav-icon" />}
            >
              <WaitingList>
                {waiting.map(({ thread, clientName }, i) => (
                  <WaitingRow
                    key={thread.id}
                    clientId={thread.clientId}
                    clientName={clientName}
                    question={thread.question}
                    age={formatAge(thread.createdAt)}
                    last={i === waiting.length - 1}
                  />
                ))}
              </WaitingList>
            </Section>
          )}

          {/* 2. Flags — open only. Dismissal captures a reason; the engine
                 retracts anything whose condition no longer holds. */}
          {flags.length > 0 && (
            <Section title={t.flagsTitle}>
              <TodayFlagList items={flags} />
            </Section>
          )}

          {/* 3. Due this week — outstanding work plus this week's, oldest first. */}
          <Section title={t.dueTitle}>
            {due.length === 0 ? (
              <DueEmpty />
            ) : (
              <DueList>
                {due.map(({ narrative, client }) => (
                  <DueRow
                    key={narrative.id}
                    narrative={narrative}
                    client={client}
                    logo={logoFor(client)}
                  />
                ))}
              </DueList>
            )}
          </Section>
        </div>
      )}
      </div>
    </div>
  );
}
