/* The admin overview's one non-obvious claim: "late".
     npx tsx --env-file=.env.local scripts/verify-overview.ts

   WHY THIS EXISTS. "Late" is a statement about the CLIENT's wall clock, not the
   agency's. A Dubai client's Monday 09:00 passes five hours before a London
   one's, and the same instant is late for one and not the other. That is the
   same class of bug that produced phantom "no tracker row" reports for two days
   running — the daily compile used the runner's yesterday instead of the ad
   account's — so it gets asserted rather than assumed.

   There is no date-fns-tz here. Both sides are rendered as sortable local
   strings ("2026-08-07 14:32") and compared as text, which is chronological
   within a zone. These cases pin that down. */
import { deadlineFor, localNowIn, getOverview } from "../lib/admin/overview";
import { runWithServiceRole } from "../lib/supabase";
import { DEFAULT_ANCHOR_TIME, type ClientProfile } from "../lib/types";

const fails: string[] = [];
function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) fails.push(detail ? `${label} — ${detail}` : label);
}

/** Just enough client to ask the question. */
const client = (
  timeZone: string,
  anchorDay?: string,
  anchorTime?: string,
): ClientProfile =>
  ({
    id: "00000000-0000-0000-0000-000000000000",
    name: "Probe",
    accountTimezone: timeZone,
    cadence: { primary: "weekly", anchorDay, anchorTime },
  }) as unknown as ClientProfile;

/* ---- The zone is the whole point ----------------------------------------- */

// 2026-08-07 06:30 UTC. Dubai (+4) is already past 09:00; London (+1 BST) is not.
const instant = new Date("2026-08-07T06:30:00Z");

const dubai = localNowIn("Asia/Dubai", instant);
const london = localNowIn("Europe/London", instant);
check(
  `Dubai reads 10:30 at 06:30 UTC (${dubai})`,
  dubai === "2026-08-07 10:30",
  `got "${dubai}"`,
);
check(
  `London reads 07:30 at the same instant (${london})`,
  london === "2026-08-07 07:30",
  `got "${london}"`,
);

const dubaiDue = deadlineFor(client("Asia/Dubai", "fri", "09:00"), instant);
const londonDue = deadlineFor(client("Europe/London", "fri", "09:00"), instant);
check(
  "both clients' Friday deadline is the same calendar date",
  dubaiDue?.local === "2026-08-07 09:00" &&
    londonDue?.local === "2026-08-07 09:00",
  `dubai=${dubaiDue?.local} london=${londonDue?.local}`,
);
check(
  "…but only Dubai's has passed",
  dubai >= dubaiDue!.local && !(london >= londonDue!.local),
  "this is the whole reason the comparison happens per client",
);

/* ---- The week is Monday-based -------------------------------------------- */

// 2026-08-07 is a Friday. Monday's deadline is 2026-08-03, already behind us.
const monday = deadlineFor(client("UTC", "mon", "09:00"), instant);
check(
  "Monday's deadline resolves to THIS week's Monday, not next",
  monday?.local === "2026-08-03 09:00",
  `got ${monday?.local}`,
);
const sunday = deadlineFor(client("UTC", "sun", "17:30"), instant);
check(
  "Sunday is the END of the same week, not the start",
  sunday?.local === "2026-08-09 17:30",
  `got ${sunday?.local}`,
);
check(
  "the label names the day and the time",
  monday?.label === "Monday 09:00",
  `got "${monday?.label}"`,
);

/* ---- Missing values fail safe -------------------------------------------- */

check(
  "no anchor day means unscheduled, not late",
  deadlineFor(client("UTC", undefined, "09:00"), instant) === null,
  "a client with no agreed day has no threshold to miss",
);
const noTime = deadlineFor(client("UTC", "mon"), instant);
check(
  `a missing time falls back to ${DEFAULT_ANCHOR_TIME}`,
  noTime?.local === `2026-08-03 ${DEFAULT_ANCHOR_TIME}`,
  `got ${noTime?.local}`,
);

/* ---- And it runs against the real roster --------------------------------- */

async function main() {
  await runWithServiceRole(async () => {
    const o = await getOverview();
    check(
      `the overview builds for all ${o.delivery.length} clients`,
      o.delivery.length > 0,
    );
    check(
      "every client has a send moment (migration 0014)",
      o.delivery.every((d) => d.state !== "unscheduled"),
      o.delivery
        .filter((d) => d.state === "unscheduled")
        .map((d) => d.client.name)
        .join(", "),
    );
    /* Sorted worst-first. An admin who reads only the top of the list has to
       see the thing that needs doing today. */
    const states = o.delivery.map((d) => d.state);
    const rank = { late: 0, due: 1, unscheduled: 2, sent: 3 };
    check(
      "the list is ordered worst-first",
      states.every(
        (s, i) => i === 0 || rank[states[i - 1]!] <= rank[s],
      ),
      states.join(" → "),
    );
    check(
      "coverage names every uncovered client",
      o.uncovered.every((c) =>
        o.delivery.some((d) => d.client.id === c.id && d.buyers.length === 0),
      ),
    );
  });
}

main().then(() => {
  console.log(
    fails.length
      ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
      : "\n✓ late is measured on the client's clock, and the roster agrees\n",
  );
  process.exit(fails.length ? 1 : 0);
});
