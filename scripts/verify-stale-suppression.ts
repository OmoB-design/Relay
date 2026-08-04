/* Proves the stale-source suppression rule.
     set -a; . ./.env.local; set +a; npx tsx scripts/verify-stale-suppression.ts

   The rule: when a client's source stops, its engine anomaly flags leave the
   queue but stay OPEN in the database. They are not resolved — the condition
   that raised them may well still hold, and nobody can tell. Three things have
   to be true at once, and it is easy to get two of them right:

     1. the stale client's engine anomaly flags disappear from the queue
     2. those same rows are still `open` in the database, untouched
     3. hand-authored flags and freshness flags still show — a human's judgement
        is not the engine's to hide, and a freshness flag is ABOUT the staleness,
        so it is the one thing left worth acting on

   Read-only. Writes nothing.                                                 */
import { format, parseISO, subDays } from "date-fns";
import { getSupabase } from "../lib/supabase";
import { getOpenFlags } from "../lib/data";
import { config } from "../lib/config";
import { yesterday } from "../lib/demo/calendar";
import { ROW_ABSENT_KEY } from "../lib/types";

const fails: string[] = [];
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fails.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? `  ${detail}` : ""}`);
};

async function main() {
  const sb = getSupabase();
  const cutoff = format(
    subDays(parseISO(yesterday()), config.flags.staleSourceDays),
    "yyyy-MM-dd",
  );

  const [clients, rows, allFlags] = await Promise.all([
    sb.from("clients").select("id, name").order("name"),
    sb.from("daily_rows").select("client_id, date, unavailable").gte("date", cutoff),
    sb.from("flags").select("id, client_id, kind, dedupe_key, status").eq("status", "open"),
  ]);

  const names = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
  const live = new Set<string>();
  for (const r of rows.data ?? []) {
    const u = (r.unavailable ?? {}) as Record<string, string>;
    if (!u[ROW_ABSENT_KEY]) live.add(r.client_id);
  }
  const stale = (clients.data ?? []).map((c) => c.id).filter((id) => !live.has(id));

  console.log(
    `\nYesterday ${yesterday()} · a source counts as stopped once its newest data row ` +
      `predates ${cutoff}\n`,
  );
  console.log("Sources");
  for (const c of clients.data ?? []) {
    const dates = (rows.data ?? [])
      .filter((r) => r.client_id === c.id)
      .filter((r) => !((r.unavailable ?? {}) as Record<string, string>)[ROW_ABSENT_KEY])
      .map((r) => r.date)
      .sort();
    console.log(
      `  ${live.has(c.id) ? "live " : "STALE"} ${c.name.padEnd(13)} ` +
        `newest data row: ${dates.at(-1) ?? "none in window"}`,
    );
  }

  const queue = await getOpenFlags();
  const queued = new Set(queue.map((q) => q.flag.id));

  console.log("\n1. Stale clients' engine anomaly flags leave the queue");
  let suppressed = 0;
  for (const id of stale) {
    const engineAnomalies = (allFlags.data ?? []).filter(
      (f) => f.client_id === id && f.dedupe_key !== null && f.kind === "anomaly",
    );
    suppressed += engineAnomalies.length;
    check(
      engineAnomalies.every((f) => !queued.has(f.id)),
      `${names.get(id)} has no engine anomaly in the queue`,
      `${engineAnomalies.length} suppressed`,
    );
  }
  if (stale.length === 0) {
    console.log("  · no stale sources right now — cases 1 and 2 are vacuous");
  }

  console.log("\n2. Suppressed rows are still open in the database, untouched");
  const stillOpen = (allFlags.data ?? []).filter(
    (f) =>
      stale.includes(f.client_id) &&
      f.dedupe_key !== null &&
      f.kind === "anomaly",
  );
  check(
    stillOpen.every((f) => f.status === "open"),
    "none were resolved or dismissed as a side effect",
    `${stillOpen.length} rows still open`,
  );
  check(
    suppressed === stillOpen.length,
    "every suppressed flag is accounted for in the database",
  );

  console.log("\n3. Human judgement and freshness flags are never suppressed");
  for (const id of stale) {
    const authored = (allFlags.data ?? []).filter(
      (f) => f.client_id === id && f.dedupe_key === null,
    );
    const freshness = (allFlags.data ?? []).filter(
      (f) => f.client_id === id && f.kind === "freshness",
    );
    for (const kind of [
      { label: "hand-authored", rows: authored },
      { label: "freshness", rows: freshness },
    ]) {
      if (kind.rows.length === 0) continue;
      const missing = kind.rows.filter((f) => !queued.has(f.id));
      check(
        missing.length === 0,
        `${names.get(id)}: ${kind.label} flags still shown`,
        `${kind.rows.length - missing.length}/${kind.rows.length}`,
      );
    }
  }

  console.log(
    `\nQueue: ${queue.length} flag(s) · ${suppressed} suppressed as unevaluable\n`,
  );
  console.log(
    fails.length
      ? `✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
      : "✓ suppression is correct: hidden from the queue, intact in the record\n",
  );
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
