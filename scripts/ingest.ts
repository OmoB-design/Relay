/* Tracker ingestion CLI (Phase 7).

     npx tsx scripts/ingest.ts                      dry-run, current pilot week
     npx tsx scripts/ingest.ts --week 2026-07-06    dry-run, specific week
     npx tsx scripts/ingest.ts --commit             write snapshots to Supabase

   Dry-run is the default and writes nothing — it proves the mapper against the
   snapshots Relay already holds before any source switch.
   Run with env loaded:
     export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/ingest.ts    */
import { subDays, format } from "date-fns";
import { runIngestion, weekOf } from "../lib/ingestion";
import { runWithServiceRole } from "../lib/supabase";
import { config } from "../lib/config";
import { now } from "../lib/clock";

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const weekArg = args[args.indexOf("--week") + 1];
// Default to the LAST COMPLETE week — a buyer reviewing on Monday morning
// wants the week that just closed, not the one that just started.
const anchor =
  args.includes("--week") && weekArg
    ? weekArg
    : format(subDays(now(), 7), "yyyy-MM-dd");

const pad = (s: string, n: number) => s.padEnd(n);
const money = (n?: number) =>
  n === undefined
    ? "—"
    : n.toLocaleString("en-US", { maximumFractionDigits: 2 });

async function main() {
  const period = weekOf(anchor);
  const report = await runIngestion({ period, commit });

  console.log(
    `\nTracker ingestion — ${commit ? "COMMIT" : "DRY RUN"} · source: ${report.source}`,
  );
  console.log(`Period: ${period.start} → ${period.end}`);
  if (report.unmatchedTabs.length) {
    console.log(
      `Tabs with no matching client: ${report.unmatchedTabs.join(", ")}`,
    );
  }

  let anyMismatch = false;

  for (const client of report.clients) {
    console.log(`\n── ${client.clientName}  (tab "${client.tabName}")`);
    const snap = client.snapshot;
    if (!snap) {
      console.log("   no rows in period");
      continue;
    }
    console.log(
      `   period as read: ${snap.period.label}   ·   source of truth: ${
        snap.items[0]?.sourceOfTruth ?? "—"
      }`,
    );

    for (const w of client.warnings) console.log(`   ⚠ ${w.message}`);
    if (client.unmappedColumns.length) {
      console.log(
        `   ⚠ unmapped tracker columns (not dropped silently): ${client.unmappedColumns.join(", ")}`,
      );
    }

    console.log(
      `   ${pad("metric", 12)} ${pad("derived", 14)} ${pad("relay holds", 14)} variance`,
    );
    for (const row of client.diff ?? []) {
      const mark =
        row.verdict === "MISMATCH"
          ? "✗"
          : row.verdict === "match" || row.verdict === "within-tolerance"
            ? "✓"
            : "·";
      if (row.verdict === "MISMATCH") anyMismatch = true;
      const variance =
        row.variancePct === undefined
          ? row.verdict
          : `${row.variancePct.toFixed(2)}%  ${row.verdict}`;
      console.log(
        `   ${mark} ${pad(row.metric, 10)} ${pad(money(row.derived), 14)} ${pad(
          money(row.existing),
          14,
        )} ${variance}`,
      );
    }
  }

  console.log(
    `\n${anyMismatch ? "✗ mapper produced mismatches beyond tolerance" : "✓ mapper agrees with Relay's data within tolerance"} (tolerance ${config.ingestion.dryRunTolerancePct}%)`,
  );
  if (commit) console.log("Snapshots written.");
  else
    console.log(
      "Nothing written — dry run. Re-run with --commit to persist.\n",
    );

  process.exit(anyMismatch && !commit ? 1 : 0);
}

runWithServiceRole(main).catch((e) => {
  console.error(e);
  process.exit(1);
});
