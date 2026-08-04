import Link from "next/link";
import { format } from "date-fns";
import { config, formatAge } from "@/lib/config";
import { isPilotClock, now } from "@/lib/clock";
import {
  getClients,
  getDueThisWeek,
  getLatestDailyRows,
  getOpenFlags,
  getWaitingThreads,
} from "@/lib/data";
import { yesterdayFor } from "@/lib/daily/compile";
import { ROW_ABSENT_KEY } from "@/lib/types";
import {
  DailyDigestBand,
  type DigestEntry,
} from "@/components/relay/DailyDigestBand";
import { DueRow } from "@/components/relay/DueRow";
import { WaitingRow } from "@/components/relay/WaitingRow";
import { EmptyState } from "@/components/relay/EmptyState";
import { TodayFlagList } from "@/components/relay/TodayFlagList";
import { Button } from "@/components/ui/button";

const t = config.copy.today;

// Reads live data (staged rows, flags, narrative states) on every request.
export const dynamic = "force-dynamic";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="font-geist text-fig-caption-1 uppercase tracking-wide text-heading-06">
        {title}
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
     of why it's missing. Three distinct absences, because they need three
     different responses from the buyer:
       · notCompiled — Relay hasn't looked yet        → re-run the compile
       · absent      — Relay looked, the row isn't there → go fill the tracker
       · stale       — the newest row is for an older day → investigate     */
  const digest: DigestEntry[] = clients.map((client) => {
    const match = dailyRows.find((d) => d.client.id === client.id);
    const expected = yesterdayFor(client);
    const logo = config.clientLogos[client.name];

    if (!match) {
      return {
        client,
        logo,
        problem: {
          kind: "notCompiled",
          message: `Not compiled for ${expected} yet.`,
        },
      };
    }
    if (match.row.date !== expected) {
      return {
        client,
        logo,
        problem: {
          kind: "stale",
          message: `Newest row is ${match.row.date}, not ${expected}. Relay reports this as absent, never as zero.`,
        },
      };
    }
    // A row staged with no metrics means Relay looked and found nothing.
    const absent = match.row.unavailable[ROW_ABSENT_KEY];
    return absent
      ? { client, logo, problem: { kind: "absent", message: absent } }
      : { client, logo, row: match.row };
  });

  const today = format(now(), "EEEE, MMMM d");

  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <header className="mb-8">
        <p className="font-geist text-fig-caption-1 uppercase tracking-wide text-heading-06">
          {today}
        </p>
        {/* The page's accessible name is "Today"; the greeting is the visible
            expression of it, so the nav label and the heading agree. */}
        <h1 className="mt-1 font-geist text-28 fig-sb text-heading-01">
          <span className="sr-only">Today — </span>
          {t.greeting}
        </h1>
        {isPilotClock && (
          <p className="mt-2 font-geist text-fig-caption-2 text-yellow-700">
            Demo clock — pinned to {today}. Unset RELAY_PILOT_NOW for the real
            date.
          </p>
        )}
      </header>

      {showFirstRun ? (
        <EmptyState
          title={t.emptyTitle}
          action={
            <Button asChild size="sm">
              <Link href="/clients">{t.emptyCta}</Link>
            </Button>
          }
        >
          {t.emptyBody}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          {/* 0. Yesterday's numbers — the morning ritual, most time-critical. */}
          <DailyDigestBand entries={digest} />

          {/* 1. Waiting on you — collapses entirely when empty, because the
                 absence of urgency is itself information. */}
          {waiting.length > 0 && (
            <Section title={t.waitingTitle}>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border-fig border-border bg-surface-primary">
                {waiting.map(({ thread, clientName }) => (
                  <WaitingRow
                    key={thread.id}
                    clientId={thread.clientId}
                    clientName={clientName}
                    question={thread.question}
                    age={formatAge(thread.createdAt)}
                  />
                ))}
              </ul>
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
              <EmptyState title={t.dueEmpty}>{t.dueEmptyBody}</EmptyState>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border-fig border-border bg-surface-primary">
                {due.map(({ narrative, client }) => (
                  <DueRow
                    key={narrative.id}
                    narrative={narrative}
                    client={client}
                  />
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
