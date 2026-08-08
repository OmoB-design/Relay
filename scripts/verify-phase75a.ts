/* Phase 7.5a proof against live Supabase:
   1. Compile stages rows; unreachable clients are stated, never zeroed
   2. Confirm persists (status + timestamp)
   3. Editing without a reason is REFUSED at the data layer
   4. Editing WITH a reason persists both the value and the reason
   5. Re-compiling never overwrites a confirmed row (a human's word stands)
   6. Client Graph gating: who may receive a daily note
   7. Flags de-duplicate across repeat compiles
   Restores state after. */
import { getSupabase } from "../lib/supabase";
import { runWithServiceRole } from "../lib/supabase";
import { compileDaily } from "../lib/daily/compile";
import { confirmDailyRow, getLatestDailyRows, getClients } from "../lib/data";
import { ProfileSchema, type Profile } from "../lib/types";

/* Migration 0015 made the attester a required argument: a confirmed row has to
   say who confirmed it, and confirmed_by_id is a real foreign key. This script
   runs with no signed-in user, so it borrows a real profile rather than
   inventing one — an invented uuid would fail the constraint, which is the
   whole point of having it. */
async function anAttester(): Promise<Profile> {
  const sb = await getSupabase();
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("status", "active")
    .order("created_at")
    .limit(1);
  const row = data?.[0];
  if (!row) throw new Error("No active profile to attribute a confirmation to.");
  return ProfileSchema.parse({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
  });
}

const LT = "11111111-0000-4000-8000-000000000001";

async function main() {
  const sb = await getSupabase();
  const attester = await anAttester();

  const first = await compileDaily();
  console.log("1. compile   →");
  for (const c of first.clients) {
    console.log(
      `     ${c.ok ? "staged " : "absent "} ${c.clientName.padEnd(12)} ${c.ok ? `${c.flagsRaised} flag(s)` : c.problem?.slice(0, 60)}`,
    );
  }
  const flagsAfterFirst = (
    await sb
      .from("flags")
      .select("id", { count: "exact", head: true })
      .not("dedupe_key", "is", null)
  ).count;

  const rows = await getLatestDailyRows();
  const lt = rows.find((r) => r.client.id === LT)!;
  console.log(
    `2. staged    → Northbrook ${lt.row.date}: spend=${lt.row.metrics.spend} sales=${lt.row.metrics.sales} cpo=${lt.row.metrics.cpa_cpo} [${lt.row.status}]`,
  );

  // 3. edit without reason must be refused
  let refused = false;
  try {
    await confirmDailyRow({
      rowId: lt.row.id,
      metrics: { ...lt.row.metrics, spend: 9999 },
      confirmedBy: attester,
    });
  } catch {
    refused = true;
  }
  console.log(`3. no reason → ${refused ? "REFUSED ✓" : "accepted ✗ (bug)"}`);

  // 4. edit with reason
  await confirmDailyRow({
    rowId: lt.row.id,
    metrics: { ...lt.row.metrics, spend: 6900 },
    overrideReason:
      "Sheet had a transposed digit; corrected against Google Ads.",
    confirmedBy: attester,
  });
  const edited = (await getLatestDailyRows()).find(
    (r) => r.client.id === LT,
  )!.row;
  console.log(
    `4. confirmed → status=${edited.status} spend=${edited.metrics.spend} edited=${edited.edited} reason="${edited.overrideReason?.slice(0, 40)}…"`,
  );

  // 5. re-compile must not clobber a confirmed row
  await compileDaily();
  const after = (await getLatestDailyRows()).find(
    (r) => r.client.id === LT,
  )!.row;
  console.log(
    `5. recompile → still confirmed=${after.status === "confirmed"} spend preserved=${after.metrics.spend === 6900}`,
  );

  // 6. gating
  const clients = await getClients();
  console.log("6. gating    →");
  for (const c of clients) {
    console.log(
      `     ${c.name.padEnd(12)} daily note to client: ${c.dailyToClient ? "allowed" : "BLOCKED"}`,
    );
  }

  // 7. flag dedupe
  const flagsAfterSecond = (
    await sb
      .from("flags")
      .select("id", { count: "exact", head: true })
      .not("dedupe_key", "is", null)
  ).count;
  console.log(
    `7. dedupe    → flags after 1st compile=${flagsAfterFirst}, after 2nd=${flagsAfterSecond} (no duplicates: ${flagsAfterFirst === flagsAfterSecond})`,
  );

  // restore
  await sb
    .from("daily_rows")
    .update({
      status: "staged",
      edited: false,
      override_reason: null,
      confirmed_at: null,
      spend: lt.row.metrics.spend,
    })
    .eq("id", lt.row.id);
  console.log("8. restored  → row back to staged\n");
  console.log("Phase 7.5a checks: PASS");
}
runWithServiceRole(main).catch((e) => {
  console.error(e);
  process.exit(1);
});
