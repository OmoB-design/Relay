/* Proves the demo calendar's arithmetic against the real clock (Phase: date rebase).
   Run: npx tsx scripts/verify-calendar.ts */
import { addDays, format, parseISO } from "date-fns";
import {
  SEED_WEEK_START,
  SEED_WEEK_END,
  demoShiftDays,
  currentWeek,
  yesterday,
  shiftDay,
  shiftStamp,
  labelFor,
} from "../lib/demo/calendar";
import { now } from "../lib/clock";

const fails: string[] = [];
const check = (label: string, got: unknown, want: unknown) => {
  const ok = String(got) === String(want);
  if (!ok) fails.push(`${label}: got ${got}, want ${want}`);
  console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(38)} ${got}`);
};

const shift = demoShiftDays();
console.log(
  `\nToday ${format(now(), "EEE yyyy-MM-dd")} · shift ${shift} days\n`,
);

console.log("Anchors");
const wk = currentWeek();
check("shift is a whole number of weeks", shift % 7, 0);
check("week start is a Monday", format(parseISO(wk.start), "EEE"), "Mon");
check("week end is a Sunday", format(parseISO(wk.end), "EEE"), "Sun");
check("week end is before today", parseISO(wk.end) < now(), true);
check(
  "week is 7 days",
  format(addDays(parseISO(wk.start), 6), "yyyy-MM-dd"),
  wk.end,
);
check(
  "yesterday is today - 1",
  yesterday(),
  format(addDays(now(), -1), "yyyy-MM-dd"),
);
check(
  "week end is not after yesterday",
  parseISO(wk.end) <= parseISO(yesterday()),
  true,
);

console.log("\nWeekday preservation (a Thursday spike must stay a Thursday)");
for (const seed of [
  SEED_WEEK_START,
  "2026-07-09",
  SEED_WEEK_END,
  "2026-06-22",
]) {
  check(
    `${seed} (${format(parseISO(seed), "EEE")})`,
    format(parseISO(shiftDay(seed)), "EEE"),
    format(parseISO(seed), "EEE"),
  );
}

console.log("\nLabels");
check("full week label", wk.label, labelFor(wk.start, wk.end));
check("same-month form", labelFor("2026-07-06", "2026-07-09"), "Jul 6–9");
check(
  "cross-month form",
  labelFor("2026-07-27", "2026-08-02"),
  "Jul 27 – Aug 2",
);

console.log("\nTimestamps keep their time and offset");
const stamped = shiftStamp("2026-07-12T23:59:00+04:00");
check("time-of-day preserved", stamped.slice(10), "T23:59:00+04:00");
check("date shifted", stamped.slice(0, 10), shiftDay("2026-07-12"));

console.log(
  fails.length
    ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
    : "\n✓ demo calendar is coherent\n",
);
process.exit(fails.length ? 1 : 0);
