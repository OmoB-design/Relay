import Link from "next/link";
import { format } from "date-fns";
import { config, formatAge, formatCadenceLine } from "@/lib/config";
import { isPilotClock, now } from "@/lib/clock";
import {
  getClients,
  getDueThisWeek,
  getLatestDailyRows,
  getOpenFlags,
  getWaitingThreads,
} from "@/lib/data";
import { ROW_ABSENT_KEY, yesterdayFor } from "@/lib/daily/compile";
import {
  DailyDigestBand,
  type DigestEntry,
} from "@/components/relay/DailyDigestBand";
import { StatusStepper } from "@/components/relay/StatusStepper";
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
      <h2 className="font-ui text-13 uppercase tracking-wide text-ink-soft">
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

    if (!match) {
      return {
        client,
        problem: {
          kind: "notCompiled",
          message: `Not compiled for ${expected} yet.`,
        },
      };
    }
    if (match.row.date !== expected) {
      return {
        client,
        problem: {
          kind: "stale",
          message: `Newest row is ${match.row.date}, not ${expected}. Relay reports this as absent, never as zero.`,
        },
      };
    }
    // A row staged with no metrics means Relay looked and found nothing.
    const absent = match.row.unavailable[ROW_ABSENT_KEY];
    return absent
      ? { client, problem: { kind: "absent", message: absent } }
      : { client, row: match.row };
  });

  const today = format(now(), "EEEE, MMMM d");

  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <header className="mb-8">
        <p className="font-ui text-13 uppercase tracking-wide text-ink-soft">
          {today}
        </p>
        {/* The page's accessible name is "Today"; the greeting is the visible
            expression of it, so the nav label and the heading agree. */}
        <h1 className="mt-1 font-display text-28 text-ink">
          <span className="sr-only">Today — </span>
          {t.greeting}
        </h1>
        {isPilotClock && (
          <p className="mt-2 font-ui text-12 text-flag">
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
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {waiting.map(({ thread, clientName }) => (
                  <li key={thread.id}>
                    <Link
                      href={`/answer-desk?client=${thread.clientId}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper"
                    >
                      <span className="min-w-0">
                        <span className="block font-display text-16 text-ink">
                          {clientName}
                        </span>
                        <span className="block truncate font-ui text-14 text-ink-soft">
                          {thread.question}
                        </span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap font-ui text-12 text-ink-soft">
                        {formatAge(thread.createdAt)} ago
                      </span>
                    </Link>
                  </li>
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
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {due.map(({ narrative, client }) => (
                  <li
                    key={narrative.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="min-w-0">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-display text-16 text-ink hover:text-verdigris"
                      >
                        {client.name}
                      </Link>
                      <span className="block font-ui text-13 text-ink-soft">
                        {formatCadenceLine(client.cadence, client.channel)} ·{" "}
                        {narrative.week.label}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <StatusStepper status={narrative.status} compact />
                      <Button
                        asChild
                        size="sm"
                        variant={
                          narrative.status === "sent" ? "outline" : "default"
                        }
                      >
                        <Link
                          href={`/clients/${client.id}/narratives/${narrative.id}`}
                        >
                          {config.copy.actionByStatus[narrative.status]}
                        </Link>
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
