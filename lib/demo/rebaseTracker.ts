import { addDays, format, parseISO } from "date-fns";
import { currentWeek, demoShiftDays, yesterday } from "@/lib/demo/calendar";
import type { TrackerRow, TrackerTab } from "@/lib/ingestion/types";

/* ============================================================================
   Rebase the FIXTURE tracker onto the current calendar.

   The fixture is authored against the seed week and stays that way — it is the
   readable record of the agency's real workbook, including two transcription
   errors preserved on purpose (a NC ROAS cell holding NCAC, an NCAC cell
   holding CPA/CPO) which are the on-screen argument for Verify mode. Rewriting
   the file would lose that; shifting at read time keeps it.

   The LIVE sheet is never touched. Its dates are whatever the buyer typed, and
   silently moving them would defeat the point of reading a source of truth.

   Three steps, in order:
     1. shift every date by whole weeks, so weekday alignment survives
     2. drop anything past yesterday — a tracker cannot know today yet
     3. carry the last row forward to yesterday, but ONLY for a tab that is
        already current as of the week end. A tab that stopped early stays
        stopped: Birkenstock's missing days are its whole reason for existing.
   ========================================================================== */

const ISO = "yyyy-MM-dd";

function shiftRow(row: TrackerRow, days: number): TrackerRow {
  return {
    ...row,
    date: format(addDays(parseISO(row.date), days), ISO),
  };
}

/** `through` is the last date the tracker should reach — the LATEST yesterday
 *  across every client's account timezone, which the caller knows and this
 *  module does not. It defaults to the runner's own yesterday, which is correct
 *  only when every client sits in the runner's zone. */
export function rebaseTab(tab: TrackerTab, through?: string): TrackerTab {
  const days = demoShiftDays();
  const lastDay = through ?? yesterday();
  const weekEnd = currentWeek().end;

  const shifted = tab.rows
    .map((r) => shiftRow(r, days))
    .filter((r) => r.date <= lastDay)
    .sort((a, b) => a.date.localeCompare(b.date));

  const latest = shifted.at(-1);
  // Was this tab up to date as of the week that just closed? Only then does it
  // make sense to have rows for the days since.
  const current = latest !== undefined && latest.date >= weekEnd;

  if (current && latest.date < lastDay) {
    // Carry the closing day forward. Every metric moves together, so derived
    // ratios stay internally consistent — a flat day, never an invented one.
    let cursor = latest.date;
    while (cursor < lastDay) {
      cursor = format(addDays(parseISO(cursor), 1), ISO);
      shifted.push({ ...latest, date: cursor });
    }
  }

  return { ...tab, rows: shifted };
}

/** Rebase parsed tabs when they came from the fixture; pass the live sheet through. */
export function rebaseTabs(
  tabs: TrackerTab[],
  source: "live" | "fixture",
  through?: string,
): TrackerTab[] {
  return source === "fixture" ? tabs.map((t) => rebaseTab(t, through)) : tabs;
}
