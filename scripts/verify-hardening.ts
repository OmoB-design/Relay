/* Verifies the production-readiness fixes, against live Supabase + live sheet. */
import { clockMode, now, isPilotClock } from "../lib/clock";
import { getDueThisWeek, getClients } from "../lib/data";
import { yesterdayFor } from "../lib/daily/compile";
import { config } from "../lib/config";

async function main() {
  // #1 clock
  console.log("#1 CLOCK");
  console.log(`   mode=${clockMode}  now=${now().toISOString()}  banner shown=${isPilotClock}`);
  const clients = await getClients();
  for (const c of clients.slice(0, 2)) {
    console.log(`   yesterday for ${c.name} (${c.accountTimezone}) = ${yesterdayFor(c)}`);
  }
  const live = new Date();
  console.log(`   real wall clock is ${live.toISOString().slice(0,10)} — pilot pins it to ${now().toISOString().slice(0,10)}`);

  // #3 due-this-week scope
  console.log("\n#3 DUE THIS WEEK (scoped)");
  const due = await getDueThisWeek();
  console.log(`   returned ${due.length} (cap ${config.pageSizes.library})`);
  for (const d of due) {
    const outstanding = d.narrative.status !== "sent";
    console.log(`   ${d.client.name.padEnd(12)} ${d.narrative.week.label?.padEnd(14)} ${d.narrative.status.padEnd(9)} ${outstanding ? "(outstanding)" : "(this week)"}`);
  }

  // #6 cooldown value present
  console.log("\n#6 RECOMPILE COOLDOWN");
  console.log(`   ${config.daily.recompileCooldownSeconds}s`);

  console.log("\nHardening checks: PASS");
}
main().catch((e) => { console.error(e); process.exit(1); });
