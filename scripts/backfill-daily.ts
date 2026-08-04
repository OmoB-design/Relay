/* Backfill the daily window.
     npx tsx scripts/backfill-daily.ts [--days 14]

   A rebased or freshly-seeded demo has no daily history, and two things need it:
     · the Numbers tab's trailing window and sparklines
     · the flag detectors, which compare against a 7-day median baseline and
       require 3 consecutive days to call a sustained drift

   Runs the real compile once per day, oldest first, so flags raise and retract
   exactly as they would have night by night — the final state is what a buyer
   would actually be looking at this morning, not a synthetic approximation.

   Run with env loaded:
     set -a; . ./.env.local; set +a; npx tsx scripts/backfill-daily.ts        */
import { addDays, format, parseISO } from "date-fns";
import { compileDaily } from "../lib/daily/compile";
import { runWithServiceRole } from "../lib/supabase";
import { config } from "../lib/config";
import { yesterday } from "../lib/demo/calendar";

const args = process.argv.slice(2);
const daysArg = args.includes("--days")
  ? Number(args[args.indexOf("--days") + 1])
  : config.daily.numbersWindowDays;

async function main() {
  const last = parseISO(yesterday());
  const first = addDays(last, -(daysArg - 1));
  console.log(
    `\nBackfilling ${daysArg} days: ${format(first, "yyyy-MM-dd")} → ${format(last, "yyyy-MM-dd")}\n`,
  );

  let staged = 0;
  let absent = 0;
  let flags = 0;

  for (let i = 0; i < daysArg; i++) {
    const date = format(addDays(first, i), "yyyy-MM-dd");
    // `at` moves the clock with the cursor, so each night's flag detection sees
    // only the history that existed by then. Compiling all 14 days at today's
    // instant would let a detector look into its own future.
    const result = await compileDaily({
      date,
      at: addDays(parseISO(date), 1),
    });
    const ok = result.clients.filter((c) => c.ok);
    const raised = ok.reduce((n, c) => n + c.flagsRaised, 0);
    staged += ok.length;
    absent += result.clients.length - ok.length;
    flags += raised;
    console.log(
      `  ${date}  staged ${String(ok.length).padStart(2)}  absent ${String(
        result.clients.length - ok.length,
      ).padStart(2)}${raised ? `  · ${raised} flag(s) raised` : ""}`,
    );
  }

  console.log(
    `\n✓ ${staged} rows staged, ${absent} absences recorded, ${flags} flag events\n`,
  );
}

runWithServiceRole(main).catch((e) => {
  console.error(e);
  process.exit(1);
});
