import { addDays, format, parseISO, subDays } from "date-fns";
import { getClients, getSnapshotsByIds, upsertSnapshot } from "@/lib/data";
import type { EvidenceSnapshot, Period } from "@/lib/types";
import { readWorkbook } from "@/lib/ingestion/read";
import { parseWorkbook } from "@/lib/ingestion/parse";
import { rebaseTabs } from "@/lib/demo/rebaseTracker";
import { mapPeriod, snapshotIdFor } from "@/lib/ingestion/map";
import { diffPassed, diffSnapshot, type DiffRow } from "@/lib/ingestion/diff";
import type { FreshnessWarning, TrackerTab } from "@/lib/ingestion/types";

/* Orchestration: read → parse → map → (diff | commit).

   Commit NEVER overwrites an existing snapshot. Tracker-derived snapshots get
   their own deterministic ids, so artifacts already pinned to seeded evidence
   keep pointing at exactly the data they were written from — the immutability
   rule applies to Relay's own history, not just the agency's rows.          */

export type ClientIngestion = {
  tabName: string;
  clientId?: string; // undefined when a tab has no matching client in Relay
  clientName?: string;
  snapshot?: EvidenceSnapshot;
  warnings: FreshnessWarning[];
  unmappedColumns: string[];
  diff?: DiffRow[];
  diffOk?: boolean;
};

export type IngestionReport = {
  source: "live" | "fixture";
  period: Period;
  clients: ClientIngestion[];
  unmatchedTabs: string[];
};

/** The prior period of equal length, for delta computation. */
function priorPeriodOf(period: Period): Period {
  const start = parseISO(period.start);
  const end = parseISO(period.end);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return {
    start: format(subDays(start, days), "yyyy-MM-dd"),
    end: format(subDays(end, days), "yyyy-MM-dd"),
  };
}

function rowsInPeriod(tab: TrackerTab, period: Period) {
  return tab.rows.filter((r) => r.date >= period.start && r.date <= period.end);
}

export async function runIngestion(options: {
  period: Period;
  commit?: boolean;
}): Promise<IngestionReport> {
  const { period, commit = false } = options;
  const { workbook, source } = await readWorkbook();
  const tabs = rebaseTabs(parseWorkbook(workbook), source);
  const clients = await getClients();

  // Match a tab to a client by name — the agency's tab names are the clients.
  const byName = new Map(clients.map((c) => [c.name.toLowerCase(), c] as const));
  const prior = priorPeriodOf(period);

  const results: ClientIngestion[] = [];
  const unmatchedTabs: string[] = [];

  for (const tab of tabs) {
    const client = byName.get(tab.tabName.toLowerCase());
    if (!client) {
      unmatchedTabs.push(tab.tabName);
      continue;
    }

    const mapped = mapPeriod({
      tab,
      clientId: client.id,
      requestedPeriod: period,
      priorRows: rowsInPeriod(tab, prior),
    });

    const entry: ClientIngestion = {
      tabName: tab.tabName,
      clientId: client.id,
      clientName: client.name,
      snapshot: mapped.snapshot,
      warnings: mapped.warnings,
      unmappedColumns: tab.unmappedColumns,
    };

    // Diff against whatever Relay already holds for this client + period.
    const existingForPeriod = (
      await getSnapshotsByIds([snapshotIdFor(client.id, period.start)])
    )[snapshotIdFor(client.id, period.start)];
    const seedForPeriod = await findSeedSnapshot(client.id, period);
    const comparison = existingForPeriod ?? seedForPeriod;
    entry.diff = diffSnapshot(mapped.snapshot, comparison);
    entry.diffOk = diffPassed(entry.diff);

    if (commit) await upsertSnapshot(mapped.snapshot);

    results.push(entry);
  }

  return { source, period, clients: results, unmatchedTabs };
}

/** The snapshot Relay already holds covering this period, if any — used as the
 *  dry-run's comparison baseline. */
async function findSeedSnapshot(
  clientId: string,
  period: Period,
): Promise<EvidenceSnapshot | undefined> {
  const { getSnapshotsForClient } = await import("@/lib/data");
  const all = await getSnapshotsForClient(clientId);
  return all.find(
    (s) => s.period.start >= period.start && s.period.start <= period.end,
  );
}

/** Convenience: the ISO week (Mon–Sun) containing a date. */
export function weekOf(date: string): Period {
  const d = parseISO(date);
  const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0
  const start = subDays(d, dayOfWeek);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(addDays(start, 6), "yyyy-MM-dd"),
  };
}
