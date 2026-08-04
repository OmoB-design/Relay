/* Emit tracker CSVs on the CURRENT calendar, ready to paste into the live sheet.
     npx tsx scripts/make-sheet-csv.ts

   The live Google Sheet is the one thing the demo calendar cannot shift for
   itself — Relay reads it and never writes to it, which is the whole point of
   calling it a source of truth. So when the demo moves forward, the sheet has to
   be refreshed by hand, and this makes that one import per tab.

   FIDELITY. Only the Date cell is rewritten. Every header row and every number
   is passed through as the exact text the fixture holds, so `6610.00` does not
   come back as `6610` and Huggers' two transcription errors survive untouched —
   they are the on-screen argument for Verify mode, and a tracker with no
   mistakes in it proves nothing.

   Dates are written in the agency's own format ("June 30, 2026") for all four
   clients, matching the tracker workbook this was transcribed from.

   The rebase rules come from lib/demo/rebaseTracker.ts — the same module the app
   reads through — so the sheet and the fixture cannot drift into disagreement.

   Writes to supabase/fixtures/sheet/ (git-ignored; regenerate any time).      */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { format, parseISO, subDays } from "date-fns";
import { readFixtureWorkbook } from "../lib/ingestion/read";
import { parseDateCell, parseWorkbook } from "../lib/ingestion/parse";
import { rebaseTab } from "../lib/demo/rebaseTracker";
import { config } from "../lib/config";
import { currentWeek, demoShiftDays, yesterday } from "../lib/demo/calendar";

const OUT_DIR = path.join(process.cwd(), "supabase/fixtures/sheet");

/** The agency's date format, as the real tracker workbook writes it. */
const SHEET_DATE = "MMMM d, yyyy";
const sheetDate = (iso: string) => format(parseISO(iso), SHEET_DATE);

/** Quote only when a cell needs it, so the output stays readable. */
const csv = (v: string) =>
  /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
const row = (cells: string[]) => cells.map(csv).join(",");

async function main() {
  const workbook = await readFixtureWorkbook();
  const tabs = parseWorkbook(workbook);
  const shift = demoShiftDays();
  const week = currentWeek();

  await mkdir(OUT_DIR, { recursive: true });
  console.log(
    `\nRebasing tracker by ${shift} days · week ${week.label} · through ${yesterday()}` +
      `\nDate format: "${sheetDate(yesterday())}"\n`,
  );

  for (const tab of tabs) {
    const raw = workbook[tab.tabName];
    if (!raw) continue;

    // Everything up to and including the "Date" column header is the tab's own
    // header block — emitted verbatim so each tab keeps its real shape.
    const headerIdx = raw.findIndex(
      (r) => r[0]?.trim() === config.ingestion.dateHeader,
    );
    if (headerIdx === -1) continue;

    // Original ISO date → the raw cells the buyer actually typed.
    const rawByDate = new Map<string, string[]>();
    for (const r of raw.slice(headerIdx + 1)) {
      const iso = parseDateCell(r[0]);
      if (iso) rawByDate.set(iso, r);
    }
    if (rawByDate.size === 0) continue;
    const lastOriginal = Array.from(rawByDate.keys()).sort().at(-1)!;

    const rebased = rebaseTab(tab);
    const lines = [
      ...raw.slice(0, headerIdx + 1).map(row),
      ...rebased.rows.map((r) => {
        // Undo the shift to find the source row. A carried-forward day has no
        // source of its own, so it reuses the closing row's numbers verbatim.
        const origin = format(subDays(parseISO(r.date), shift), "yyyy-MM-dd");
        const source = rawByDate.get(origin) ?? rawByDate.get(lastOriginal)!;
        return row([sheetDate(r.date), ...source.slice(1)]);
      }),
    ];

    await writeFile(
      path.join(OUT_DIR, `${tab.tabName}.csv`),
      `${lines.join("\n")}\n`,
      "utf8",
    );

    const first = rebased.rows[0].date;
    const last = rebased.rows.at(-1)!.date;
    console.log(
      `  ${tab.tabName.padEnd(13)} ${String(rebased.rows.length).padStart(2)} rows  ` +
        `${sheetDate(first)} → ${sheetDate(last)}` +
        (last < yesterday() ? "   ← stops early on purpose (missing-days case)" : ""),
    );
  }

  console.log("\n✓ written to supabase/fixtures/sheet/\n");
  console.log("Per client tab in the live sheet:");
  console.log("  1. select cell A1");
  console.log("  2. File → Import → upload that client's CSV");
  console.log('  3. Import location: "Replace data at selected cell"');
  console.log("  4. Separator: comma. Leave \"Convert text to numbers\" ticked.");
  console.log(
    "  5. Then select column A → Format → Number → Custom date and time →",
  );
  console.log(
    '     "Month D, YYYY", so the sheet displays the format it was given.\n',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
