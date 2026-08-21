import { format, parseISO } from "date-fns";
import { now as clockNow } from "@/lib/clock";
import {
  getClients,
  raiseFlags,
  resolveStaleFlags,
  upsertStagedRow,
} from "@/lib/data";
import { readWorkbook } from "@/lib/ingestion/read";
import { parseWorkbook } from "@/lib/ingestion/parse";
import { rebaseTabs } from "@/lib/demo/rebaseTracker";
import { latestYesterdayAcross, yesterdayIn } from "@/lib/demo/calendar";
import type { TrackerTab } from "@/lib/ingestion/types";
import {
  ROW_ABSENT_KEY,
  type ClientProfile,
  type DailyMetrics,
  type MetricKey,
} from "@/lib/types";
import { detectFlags, type DetectedFlag } from "@/lib/daily/flags";

/* ============================================================================
   The nightly compile (Phase 7.5a).

     read source → stage one row per client for the target day → detect flags

   Runs at config.daily.pullHour so the digest is waiting before the buyer's
   start time. Rows land as `staged`; nothing is committed to Relay's evidence
   until a human confirms — the data-layer expression of "no auto-send".

   Source today is the agency tracker (ladder rung 1). Phase 7.5b swaps in
   Google Ads without changing anything downstream of `stageRowsFor`.
   ========================================================================== */

/** Key under which a whole-row absence reason is stored, so the UI can tell
 *  "we looked and there was nothing" apart from "one metric is missing". */

const TRACKED: MetricKey[] = [
  "spend",
  "sales",
  "revenue",
  "roas",
  "cpa_cpo",
  "nc_roas",
  "ncac",
  "nvp",
];

export type CompiledClient = {
  clientId: string;
  clientName: string;
  date: string;
  ok: boolean;
  /** Stated reason when a row couldn't be produced — never rendered as zero. */
  problem?: string;
  flagsRaised: number;
  /** Engine flags retracted because their condition no longer holds. */
  flagsResolved: number;
};

export type CompileResult = {
  source: "live" | "fixture";
  clients: CompiledClient[];
};

/** "Yesterday" in the ad account's timezone — not the agency's, not the
 *  server's UTC. A Dubai agency running a US account has two yesterdays. */
export function yesterdayFor(client: ClientProfile, at?: Date): string {
  return yesterdayIn(client.accountTimezone, at ?? clockNow());
}

/** The last date the tracker has to reach to satisfy EVERY client.
 *
 *  Clients ahead of the runner roll over first, so the bound is the furthest-
 *  ahead client's yesterday, never the runner's. Getting this wrong does not
 *  fail loudly: the sheet simply lacks the row and the digest reports an honest
 *  absence for data that was there all along. */
export function latestYesterday(clients: ClientProfile[], at?: Date): string {
  return latestYesterdayAcross(
    clients.map((c) => c.accountTimezone),
    at ?? clockNow(),
  );
}

/** The tracker's column names are the agency's vocabulary; `sales` here is the
 *  order count Relay stores internally as `conversions`. Kept fractional. */
function metricsFromRow(
  tab: TrackerTab,
  date: string,
): { metrics: DailyMetrics; found: boolean } {
  const row = tab.rows.find((r) => r.date === date);
  if (!row) return { metrics: {}, found: false };
  const metrics: DailyMetrics = {};
  for (const metric of TRACKED) {
    // The tracker's "Sales" column is stored internally as `conversions`.
    const key: MetricKey = metric === "sales" ? "conversions" : metric;
    const value = row.metrics[key];
    if (value !== undefined) metrics[metric as keyof DailyMetrics] = value;
  }
  return { metrics, found: true };
}

/** Metrics the source structurally cannot provide, with the reason said out
 *  loud — the pattern a good Slack report already uses ("this account does not
 *  report new vs. returning customer data"). */
function unavailabilityFor(
  client: ClientProfile,
  metrics: DailyMetrics,
): Record<string, string> {
  const out: Record<string, string> = {};
  const newCustomerMetrics: (keyof DailyMetrics)[] = ["nc_roas", "ncac", "nvp"];
  for (const metric of newCustomerMetrics) {
    if (metrics[metric] === undefined) {
      out[metric] =
        client.sourceOfTruth === "Triple Whale"
          ? "Not present in the tracker row for this date."
          : "This account does not report new vs. returning customer data; new-customer metrics are unavailable.";
    }
  }
  return out;
}

export async function compileDaily(options?: {
  /** Override the compile date (defaults to each client's own yesterday). */
  date?: string;
  /** Override "now" — used by tests and backfills. */
  at?: Date;
}): Promise<CompileResult> {
  const { workbook, source } = await readWorkbook();
  const clients = await getClients();
  /* The fixture is authored against the seed week; rebase it onto the current
     calendar so "yesterday" always has a row. The live sheet passes through.
     The bound has to be the FURTHEST-AHEAD client's yesterday — clients are
     loaded first for exactly that reason. */
  const tabs = rebaseTabs(
    parseWorkbook(workbook),
    source,
    latestYesterday(clients, options?.at),
  );
  const byName = new Map(tabs.map((t) => [t.tabName.toLowerCase(), t] as const));

  const results: CompiledClient[] = [];

  for (const client of clients) {
    const date = options?.date ?? yesterdayFor(client, options?.at);

    /* Phase 7.5b: a client mapped to a Google Ads customer pulls straight
       from the API — same staging, same flags, same honesty rules. Failure
       stages an ABSENT row with the stated reason, never a zero, and never
       silently falls back to a tracker tab that may be stale. */
    if (client.googleAdsCustomerId) {
      results.push(await compileFromGoogleAds(client, date));
      continue;
    }

    const tab = byName.get(client.name.toLowerCase());

    if (!tab) {
      results.push({
        clientId: client.id,
        clientName: client.name,
        date,
        ok: false,
        problem: `No tracker tab named "${client.name}" — couldn't reach this client's data.`,
        flagsRaised: 0,
        flagsResolved: 0,
      });
      continue;
    }

    const { metrics, found } = metricsFromRow(tab, date);
    if (!found) {
      // Stage an EMPTY row rather than nothing: the day is accounted for, and
      // the reason travels with it to the morning band. Absent, never zero.
      const problem = `No tracker row for ${format(parseISO(date), "MMM d")}.`;
      await upsertStagedRow({
        clientId: client.id,
        date,
        segment: "overall",
        source: "Tracker",
        sourceOfTruth: client.sourceOfTruth,
        metrics: {},
        unavailable: { [ROW_ABSENT_KEY]: problem },
      });
      results.push({
        clientId: client.id,
        clientName: client.name,
        date,
        ok: false,
        problem,
        flagsRaised: 0,
        flagsResolved: 0,
      });
      continue;
    }

    await upsertStagedRow({
      clientId: client.id,
      date,
      segment: "overall", // the tracker is account-level; 7.5b adds the split
      source: "Tracker",
      sourceOfTruth: client.sourceOfTruth,
      metrics,
      unavailable: unavailabilityFor(client, metrics),
    });

    const detected: DetectedFlag[] = detectFlags({
      client,
      rows: tab.rows.filter((r) => r.date <= date),
      onDate: date,
    });
    const raised = await raiseFlags(detected);
    // Every compile re-judges the day: anything the detectors no longer find is
    // retracted, so the queue never shows a flag quoting a number that has
    // since moved. Without this, editing the sheet fixes the row but leaves a
    // stale warning behind.
    const resolved = await resolveStaleFlags({
      clientId: client.id,
      activeKeys: detected.map((d) => d.dedupeKey),
    });

    results.push({
      clientId: client.id,
      clientName: client.name,
      date,
      ok: true,
      flagsRaised: raised,
      flagsResolved: resolved,
    });
  }

  return { source, clients: results };
}

/** The Google Ads leg of the compile: fetch the flag window from the API,
 *  stage the day's row, run the same detectors. One client, one account. */
async function compileFromGoogleAds(
  client: ClientProfile,
  date: string,
): Promise<CompiledClient> {
  const { fetchDailyRows } = await import("@/lib/google-ads");
  const windowStart = format(
    parseISO(date).getTime() - 44 * 86_400_000,
    "yyyy-MM-dd",
  );

  let rows;
  try {
    rows = await fetchDailyRows(client.googleAdsCustomerId!, windowStart, date);
  } catch (e) {
    const problem = `Google Ads unreachable: ${e instanceof Error ? e.message : "unknown error"}`;
    await upsertStagedRow({
      clientId: client.id,
      date,
      segment: "overall",
      source: "Google Ads",
      sourceOfTruth: client.sourceOfTruth,
      metrics: {},
      unavailable: { [ROW_ABSENT_KEY]: problem },
    });
    return {
      clientId: client.id,
      clientName: client.name,
      date,
      ok: false,
      problem,
      flagsRaised: 0,
      flagsResolved: 0,
    };
  }

  const dayRow = rows.find((r) => r.date === date);
  if (!dayRow || Object.keys(dayRow.metrics).length === 0) {
    const problem = `Google Ads has no data for ${format(parseISO(date), "MMM d")} yet.`;
    await upsertStagedRow({
      clientId: client.id,
      date,
      segment: "overall",
      source: "Google Ads",
      sourceOfTruth: client.sourceOfTruth,
      metrics: {},
      unavailable: { [ROW_ABSENT_KEY]: problem },
    });
    return {
      clientId: client.id,
      clientName: client.name,
      date,
      ok: false,
      problem,
      flagsRaised: 0,
      flagsResolved: 0,
    };
  }

  const metrics: DailyMetrics = {};
  for (const metric of TRACKED) {
    const key: MetricKey = metric === "sales" ? "conversions" : metric;
    const value = dayRow.metrics[key];
    if (value !== undefined) metrics[metric as keyof DailyMetrics] = value;
  }

  await upsertStagedRow({
    clientId: client.id,
    date,
    segment: "overall",
    source: "Google Ads",
    sourceOfTruth: client.sourceOfTruth,
    metrics,
    unavailable: unavailabilityFor(client, metrics),
  });

  const detected: DetectedFlag[] = detectFlags({
    client,
    rows: rows.filter((r) => r.date <= date),
    onDate: date,
  });
  const raised = await raiseFlags(detected);
  const resolved = await resolveStaleFlags({
    clientId: client.id,
    activeKeys: detected.map((d) => d.dedupeKey),
  });

  return {
    clientId: client.id,
    clientName: client.name,
    date,
    ok: true,
    flagsRaised: raised,
    flagsResolved: resolved,
  };
}
