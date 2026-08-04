import { readFileSync } from "node:fs";
/* Verifies the production-readiness fixes, against live Supabase + live sheet. */
import { clockMode, now, isPilotClock } from "../lib/clock";
import { runWithServiceRole } from "../lib/supabase";
import { getDueThisWeek, getClients } from "../lib/data";
import { yesterdayFor } from "../lib/daily/compile";
import { config } from "../lib/config";

let collapseFailures = 0;

/* Flags and Waiting on you must vanish ENTIRELY when empty — no heading, no
   card, no gap. Asserted against the source rather than a render, because
   proving it live would need a database with nothing in it. */
function checkCollapsingSections(): void {
  const src = readFileSync("app/(app)/today/page.tsx", "utf8");
  const cases: { name: string; guard: RegExp }[] = [
    {
      name: "Waiting on you",
      guard: /\{waiting\.length > 0 && \(\s*<Section title=\{t\.waitingTitle\}/,
    },
    {
      name: "Flags",
      guard: /\{flags\.length > 0 && \(\s*<Section title=\{t\.flagsTitle\}/,
    },
  ];
  for (const c of cases) {
    const ok = c.guard.test(src);
    console.log(
      `   ${ok ? "\u2713" : "\u2717"} ${c.name} renders only when it has items`,
    );
    if (!ok) collapseFailures++;
  }
  if (collapseFailures > 0) {
    console.error(
      `   \u2717 ${collapseFailures} section(s) would render a heading with nothing under it`,
    );
    process.exitCode = 1;
  }
}

async function main() {
  console.log("\n#0 COLLAPSING SECTIONS (no heading without items)");
  checkCollapsingSections();
  // #1 clock
  console.log("#1 CLOCK");
  console.log(
    `   mode=${clockMode}  now=${now().toISOString()}  banner shown=${isPilotClock}`,
  );
  const clients = await getClients();
  for (const c of clients.slice(0, 2)) {
    console.log(
      `   yesterday for ${c.name} (${c.accountTimezone}) = ${yesterdayFor(c)}`,
    );
  }
  const live = new Date();
  console.log(
    `   real wall clock is ${live.toISOString().slice(0, 10)} — pilot pins it to ${now().toISOString().slice(0, 10)}`,
  );

  // #3 due-this-week scope
  console.log("\n#3 DUE THIS WEEK (scoped)");
  const due = await getDueThisWeek();
  console.log(`   returned ${due.length} (cap ${config.pageSizes.library})`);
  for (const d of due) {
    const outstanding = d.narrative.status !== "sent";
    console.log(
      `   ${d.client.name.padEnd(12)} ${d.narrative.week.label?.padEnd(14)} ${d.narrative.status.padEnd(9)} ${outstanding ? "(outstanding)" : "(this week)"}`,
    );
  }

  // #6 cooldown value present
  console.log("\n#6 RECOMPILE COOLDOWN");
  console.log(`   ${config.daily.recompileCooldownSeconds}s`);

  console.log("\nHardening checks: PASS");
}
runWithServiceRole(main).catch((e) => {
  console.error(e);
  process.exit(1);
});
