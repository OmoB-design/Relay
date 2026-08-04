/* Round-trip the emitted sheet CSVs back through Relay's real parser.
     npx tsx scripts/verify-sheet-csv.ts   (run make-sheet-csv.ts first)

   WHY THIS EXISTS. The CSVs are written for a human to import into Google
   Sheets, and Relay then reads that sheet back. If the parser can't read what
   the emitter writes, the import is worse than useless — it silently changes
   what the source of truth says. This proves the loop closes: emitted text →
   parser → the same dates and the same numbers as the rebased fixture.

   The agency writes dates as "August 3, 2026". That format is ambiguous in a
   way ISO is not, and a date that parses one day off is exactly the bug class
   that already bit this pipeline once (a UTC conversion filed every row a day
   early in GST), so it gets an explicit test rather than a comment.          */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseTab } from "../lib/ingestion/parse";
import { runWithServiceRole } from "../lib/supabase";
import { readFixtureWorkbook } from "../lib/ingestion/read";
import { parseWorkbook } from "../lib/ingestion/parse";
import { rebaseTab } from "../lib/demo/rebaseTracker";
import { yesterday } from "../lib/demo/calendar";
import type { MetricKey } from "../lib/types";

const DIR = path.join(process.cwd(), "supabase/fixtures/sheet");

/** Minimal RFC-4180 row split: honours quotes and doubled escapes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

const fails: string[] = [];

async function main() {
  const files = (await readdir(DIR).catch(() => [])).filter((f) =>
    f.endsWith(".csv"),
  );
  if (files.length === 0) {
    console.error(
      "\n✗ No CSVs found. Run `npx tsx scripts/make-sheet-csv.ts` first.\n",
    );
    process.exit(1);
  }

  // The expected answer: the fixture, rebased exactly as the app reads it.
  const expected = new Map(
    parseWorkbook(await readFixtureWorkbook())
      .map(rebaseTab)
      .map((t) => [t.tabName, t] as const),
  );

  console.log(
    `\nRound-tripping ${files.length} CSVs · through ${yesterday()}\n`,
  );

  for (const file of files.sort()) {
    const tabName = path.basename(file, ".csv");
    const text = await readFile(path.join(DIR, file), "utf8");
    const rows = text
      .split("\n")
      .filter((l) => l.length > 0)
      .map(splitCsvLine);

    const parsed = parseTab(tabName, rows);
    const want = expected.get(tabName);
    if (!want) {
      fails.push(`${tabName}: no matching fixture tab`);
      continue;
    }

    const problems: string[] = [];
    if (parsed.rows.length !== want.rows.length) {
      problems.push(`${parsed.rows.length} rows, expected ${want.rows.length}`);
    }
    if (parsed.sourceOfTruth !== want.sourceOfTruth) {
      problems.push(
        `source of truth "${parsed.sourceOfTruth}" ≠ "${want.sourceOfTruth}"`,
      );
    }
    if (parsed.unmappedColumns.length) {
      problems.push(`unmapped columns: ${parsed.unmappedColumns.join(", ")}`);
    }

    const n = Math.min(parsed.rows.length, want.rows.length);
    for (let i = 0; i < n; i++) {
      const got = parsed.rows[i];
      const exp = want.rows[i];
      if (got.date !== exp.date) {
        problems.push(`row ${i + 1}: date ${got.date} ≠ ${exp.date}`);
        continue;
      }
      for (const key of Object.keys(exp.metrics) as MetricKey[]) {
        if (got.metrics[key] !== exp.metrics[key]) {
          problems.push(
            `${exp.date} ${key}: ${got.metrics[key]} ≠ ${exp.metrics[key]}`,
          );
        }
      }
    }

    const last = parsed.rows.at(-1)?.date;
    console.log(
      `  ${problems.length === 0 ? "✓" : "✗"} ${tabName.padEnd(13)} ` +
        `${String(parsed.rows.length).padStart(2)} rows  ${parsed.rows[0]?.date} → ${last}` +
        `  ${parsed.sourceOfTruth ?? "—"}`,
    );
    for (const p of problems.slice(0, 6)) console.log(`      ${p}`);
    if (problems.length > 6)
      console.log(`      … +${problems.length - 6} more`);
    if (problems.length)
      fails.push(`${tabName}: ${problems.length} problem(s)`);
  }

  // The two deliberate transcription errors must survive the whole round trip.
  const huggers = expected.get("Huggers");
  const dup = huggers?.rows.filter(
    (r) =>
      (r.metrics.nc_roas !== undefined &&
        r.metrics.nc_roas === r.metrics.ncac) ||
      (r.metrics.ncac !== undefined && r.metrics.ncac === r.metrics.cpa_cpo),
  );
  console.log(
    `\n  ${dup && dup.length === 2 ? "✓" : "✗"} Huggers transcription errors preserved: ` +
      `${dup?.map((r) => r.date).join(", ") ?? "none"}`,
  );
  if (!dup || dup.length !== 2) {
    fails.push("Huggers transcription errors did not survive the rebase");
  }

  console.log(
    fails.length
      ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
      : "\n✓ emitter and parser agree — the sheet round-trip is safe\n",
  );
  process.exit(fails.length ? 1 : 0);
}

runWithServiceRole(main).catch((e) => {
  console.error(e);
  process.exit(1);
});
