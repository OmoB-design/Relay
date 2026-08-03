/* Phase 2 proof: profile edits persist to Supabase and survive re-read.
   Exercises the same lib/data.ts functions the server actions call, then
   restores the original values. Run:
     export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/verify-phase2-persistence.ts */
import {
  deleteSensitivity,
  getClientProfile,
  saveSensitivity,
  updateKpi,
} from "../lib/data";

const NORTHBROOK = "11111111-0000-4000-8000-000000000001";

async function main() {
  const before = await getClientProfile(NORTHBROOK);
  if (!before) throw new Error("Northbrook not found");
  const cpo = before.kpis.find((k) => k.label === "cost per order");
  if (!cpo) throw new Error("cost per order KPI not found");
  console.log(`1. read      → "${cpo.label}" target $${cpo.target}`);

  // --- KPI edit round-trip ---
  await updateKpi(cpo.id, { label: cpo.label, target: 27.5, polarity: cpo.polarity });
  const after = await getClientProfile(NORTHBROOK);
  const edited = after!.kpis.find((k) => k.id === cpo.id)!;
  console.log(`2. update    → target $${edited.target} (expected 27.5)`);
  if (edited.target !== 27.5) throw new Error("KPI edit did not persist");
  await updateKpi(cpo.id, { label: cpo.label, target: cpo.target, polarity: cpo.polarity });
  const restored = await getClientProfile(NORTHBROOK);
  console.log(`3. restore   → target $${restored!.kpis.find((k) => k.id === cpo.id)!.target}`);

  // --- Sensitivity add + structured-shape check + remove ---
  await saveSensitivity({
    clientId: NORTHBROOK,
    type: "cadence",
    text: "TEST — remove me: send drafts before 9am GST.",
  });
  const withNew = await getClientProfile(NORTHBROOK);
  const added = withNew!.sensitivities.find((s) => s.text.startsWith("TEST"));
  if (!added) throw new Error("sensitivity insert did not persist");
  console.log(`4. add       → sensitivity {type: "${added.type}", text: "${added.text.slice(0, 30)}…"} (structured, typed)`);
  await deleteSensitivity(added.id);
  const cleaned = await getClientProfile(NORTHBROOK);
  const gone = !cleaned!.sensitivities.some((s) => s.id === added.id);
  console.log(`5. remove    → ${gone ? "deleted cleanly" : "STILL PRESENT (fail)"}`);
  if (!gone) throw new Error("cleanup failed");

  console.log("\nPersistence round-trip: PASS (KPI edit + structured sensitivity, via live Supabase)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
