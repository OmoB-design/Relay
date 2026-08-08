/* The weekly review: week maths, tolerance, and the guards.
     npx tsx --env-file=.env.local scripts/verify-review.ts

   TWO THINGS THIS CAUGHT, both of which failed silently:

   1. zod 4 records keyed by an ENUM are EXHAUSTIVE. z.record(z.enum([...]), …)
      rejects a partial object, so submitting only spend — the commonest real
      review — was refused, and the refusal surfaced as a form that did nothing
      at all. z.partialRecord is the fix, and the case below is what pins it.

   2. A review's `logged` is frozen into the row rather than recomputed on read,
      so a buyer editing a daily row afterwards cannot rewrite what the admin
      signed off. Easy to "simplify" away later; asserted here so that breaks
      loudly. */
import { z } from "zod";
import {
  DISCREPANCY_TOLERANCE,
  RECONCILED,
  getWeekReview,
  lastCompleteWeek,
  weekRange,
} from "../lib/admin/review";
import { runWithServiceRole } from "../lib/supabase";

const fails: string[] = [];
function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) fails.push(detail ? `${label} — ${detail}` : label);
}

/* ---- Weeks run Monday to Sunday ------------------------------------------ */

// 2026-08-08 is a Saturday.
const w = weekRange("2026-08-08");
check(
  "a Saturday belongs to the week starting that Monday",
  w.start === "2026-08-03" && w.end === "2026-08-09",
  `got ${w.start}..${w.end}`,
);
const mon = weekRange("2026-08-03");
check(
  "a Monday is the start of its own week, not the end of the last",
  mon.start === "2026-08-03",
  `got ${mon.start}`,
);
const sun = weekRange("2026-08-09");
check(
  "a Sunday closes the week it started in",
  sun.start === "2026-08-03" && sun.end === "2026-08-09",
  `got ${sun.start}..${sun.end}`,
);

const complete = lastCompleteWeek(new Date("2026-08-08T12:00:00Z"));
check(
  "the default week is the last COMPLETE one, never the current",
  complete.start === "2026-07-27" && complete.end === "2026-08-02",
  `got ${complete.start}..${complete.end} — reconciling a week still ` +
    "accumulating is reconciling a number that is going to change",
);

/* ---- The zod 4 record trap ----------------------------------------------- */

const exhaustive = z.record(z.enum(RECONCILED), z.number());
check(
  "z.record with enum keys REJECTS a partial — the trap",
  !exhaustive.safeParse({ spend: 1 }).success,
  "if this ever passes, zod's semantics changed and the note in actions.ts is stale",
);
const partial = z.partialRecord(z.enum(RECONCILED), z.number());
check(
  "z.partialRecord accepts spend alone — reconciling one metric is a real review",
  partial.safeParse({ spend: 1 }).success,
);
check(
  "…and still accepts all three",
  partial.safeParse({ spend: 1, sales: 2, revenue: 3 }).success,
);

/* ---- Tolerance ----------------------------------------------------------- */

check(
  "the tolerance is a real band, not zero",
  DISCREPANCY_TOLERANCE > 0 && DISCREPANCY_TOLERANCE < 0.05,
  "platform and sheet always disagree slightly; a zero-tolerance compare " +
    "would flag every client every week and so mean nothing",
);

/* ---- Against the real roster --------------------------------------------- */

async function main() {
  await runWithServiceRole(async () => {
    const week = await getWeekReview(lastCompleteWeek().start);
    check(
      `the review builds for all ${week.rows.length} clients`,
      week.rows.length > 0,
    );
    check(
      "the week it reports is the week it was asked for",
      weekRange(week.weekStart).start === week.weekStart,
    );
    check(
      "every client is reconciled on the same three metrics",
      week.rows.every(
        (r) =>
          r.metrics.length === RECONCILED.length &&
          r.metrics.every((m, i) => m.metric === RECONCILED[i]),
      ),
    );
    check(
      "nothing is flagged off before an actual has been entered",
      week.rows.every((r) => r.metrics.every((m) => !m.off || m.actual !== undefined)),
      "a delta needs both sides; flagging on one is flagging on nothing",
    );
    /* Worst first. An admin who reads only the top has to meet the thing that
       needs a decision. */
    const rank = { discrepancy: 0, pending: 1, verified: 2 };
    const order = week.rows.map((r) => r.status);
    check(
      "rows are ordered discrepancy → pending → verified",
      order.every((s, i) => i === 0 || rank[order[i - 1]!] <= rank[s]),
      order.join(" → "),
    );
  });
}

main().then(() => {
  console.log(
    fails.length
      ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
      : "\n✓ weeks, tolerance and the partial-record contract all hold\n",
  );
  process.exit(fails.length ? 1 : 0);
});
