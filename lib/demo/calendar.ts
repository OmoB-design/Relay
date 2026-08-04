import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { now } from "@/lib/clock";

/* ============================================================================
   The demo calendar.

   THE PROBLEM. The seed describes a specific week — Mon 6 – Sun 12 Jul 2026 —
   and every narrative, snapshot, flag and tracker row hangs off it. Two weeks
   after authoring, that week is history: "yesterday" no longer has a row, the
   week's draft is stale, and Today reports absences that are true but useless.
   Freezing the clock hid the problem; it did not fix it.

   THE FIX. Author against the seed week — which stays readable, and matches
   supabase/seed.sql line for line — then shift by whole weeks at load, so the
   seed week always lands on the most recently COMPLETED Monday–Sunday week.

   Whole weeks, never a raw day count: a weekly cadence anchored to Monday has
   to stay anchored to Monday, and a Thursday spike has to stay on a Thursday.
   Shifting by 22 days instead of 21 would silently move every weekday.

   Two anchors, because the app has two rhythms:
     · weekEnd    — the last complete Sun. Weekly narratives, snapshots, briefs.
     · yesterday  — what the nightly compile asks for. Daily rows, flags.
   On a Tuesday those differ by a day, and that is correct: the weekly draft
   covers the week that closed while the digest covers the day that just ended.
   ========================================================================== */

/** The week the seed is authored against. Matches supabase/seed.sql. */
export const SEED_WEEK_START = "2026-07-06"; // Monday
export const SEED_WEEK_END = "2026-07-12"; // Sunday

const ISO_DAY = "yyyy-MM-dd";

/** The most recent Sunday strictly before today, in whole days from today.
 *  Sun→7, Mon→1, Tue→2 … so the current, incomplete week is never used. */
function lastCompleteWeekEnd(at: Date): Date {
  const isoDow = at.getDay() === 0 ? 7 : at.getDay();
  return addDays(at, -isoDow);
}

/** Days to add to a seed-week date to bring it onto the current week.
 *  Always a multiple of 7, so weekday alignment survives. */
export function demoShiftDays(at: Date = now()): number {
  return differenceInCalendarDays(
    lastCompleteWeekEnd(at),
    parseISO(SEED_WEEK_END),
  );
}

/** Shift an ISO date (yyyy-MM-dd) onto the current calendar. */
export function shiftDay(iso: string, at: Date = now()): string {
  return format(addDays(parseISO(iso), demoShiftDays(at)), ISO_DAY);
}

/** Shift a full ISO timestamp, preserving its time-of-day and offset.
 *  Operates on the string so a "23:59+04:00" stays 23:59 in +04:00 rather
 *  than drifting to the runner's local zone. */
export function shiftStamp(iso: string, at: Date = now()): string {
  const [datePart, ...rest] = iso.split("T");
  if (rest.length === 0) return shiftDay(iso, at);
  return `${shiftDay(datePart, at)}T${rest.join("T")}`;
}

/** The current demo week, already shifted. */
export function currentWeek(at: Date = now()): {
  start: string;
  end: string;
  label: string;
} {
  const start = shiftDay(SEED_WEEK_START, at);
  const end = shiftDay(SEED_WEEK_END, at);
  return { start, end, label: labelFor(start, end) };
}

/** "Jul 27 – Aug 2" / "Jul 27–30" — the seed's own label convention: the month
 *  is repeated only when the period crosses one. */
export function labelFor(startIso: string, endIso: string): string {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const sameMonth = format(start, "MMM") === format(end, "MMM");
  return sameMonth
    ? `${format(start, "MMM d")}–${format(end, "d")}`
    : `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
}

/** What the nightly compile asks for. Not derived from the week anchor —
 *  the daily rhythm runs to the day that just ended, whatever weekday it is. */
export function yesterday(at: Date = now()): string {
  return format(addDays(at, -1), ISO_DAY);
}

/** True when the seed is already sitting on the current week — the shift is a
 *  no-op. Useful for tests and for the reset script's output. */
export const isRebased = (at: Date = now()): boolean => demoShiftDays(at) === 0;
