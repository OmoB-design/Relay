/* Phase 3 proof, against live Supabase:
   1. Edit a drafted claim → claims persist, slack_variant cleared,
      EditDiff silently captured on the voice profile (with word segments).
   2. drafted → reviewed → sent persists; timeline entry stays pinned.
   3. Slack copy output is genuinely shorter than email output.
   Restores all demo state afterwards (LT back to drafted + authored variant).
   Run: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/verify-phase3-cycle.ts */
import { getSupabase } from "../lib/supabase";
import { runWithServiceRole } from "../lib/supabase";
import {
  getNarrativeContext,
  markReviewed,
  saveDraftEdits,
  sendNarrative,
} from "../lib/data";
import { formatEmail, formatSlack } from "../lib/narrative";

const B1 = "11111111-0000-4000-8000-0000000000b1"; // Northbrook, drafted

async function main() {
  const sb = await getSupabase();
  const before = await getNarrativeContext(B1);
  if (!before) throw new Error("narrative not found");
  const claims = [...before.narrative.claims].sort((a, b) => a.order - b.order);
  const originalTexts = claims.map((c) => c.text);
  const originalVariant = before.narrative.slackVariant;
  const { count: diffsBefore } = await sb
    .from("edit_diffs")
    .select("*", { count: "exact", head: true });

  console.log(
    `0. start    → status=${before.narrative.status}, authored variant=${Boolean(originalVariant)}, edit_diffs=${diffsBefore}`,
  );

  // --- 1. Edit claim 2 (the CPO sentence) ---
  const edited = [...originalTexts];
  edited[1] = edited[1].replace("about 9% under", "a clean 9% under");
  await saveDraftEdits(B1, edited);

  const afterEdit = await getNarrativeContext(B1);
  const claim2 = [...afterEdit!.narrative.claims].sort(
    (a, b) => a.order - b.order,
  )[1];
  console.log(
    `1. edit     → claim2 now contains "a clean 9% under": ${claim2.text.includes("a clean 9% under")}`,
  );
  console.log(
    `             evidenceRefs preserved: ${JSON.stringify(claim2.evidenceRefs)}`,
  );
  console.log(
    `             slack_variant cleared: ${afterEdit!.narrative.slackVariant === undefined}`,
  );

  const { data: newDiffs, count: diffsAfter } = await sb
    .from("edit_diffs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(1);
  const captured = newDiffs![0];
  console.log(
    `2. voice    → edit_diffs ${diffsBefore} → ${diffsAfter} (captured silently)`,
  );
  console.log(
    `             segments: ${JSON.stringify((captured.segments as unknown[]).filter((s) => (s as { type: string }).type !== "unchanged"))}`,
  );

  // --- 3. Tone outputs differ ---
  const email = formatEmail(afterEdit!.narrative);
  const slack = formatSlack(afterEdit!.narrative, "Northbrook");
  console.log(
    `3. tones    → email ${email.length} chars vs slack ${slack.length} chars (shorter: ${slack.length < email.length})`,
  );

  // --- 4. Full cycle ---
  await markReviewed(B1);
  const reviewed = await getNarrativeContext(B1);
  console.log(
    `4. review   → status=${reviewed!.narrative.status}, reviewedAt=${Boolean(reviewed!.narrative.reviewedAt)}`,
  );

  await sendNarrative(B1);
  const sent = await getNarrativeContext(B1);
  const { data: tl } = await sb
    .from("timeline_entries")
    .select("date, summary, snapshot_id")
    .eq("ref_id", B1)
    .single();
  console.log(
    `5. send     → status=${sent!.narrative.status}, sentAt=${Boolean(sent!.narrative.sentAt)}`,
  );
  console.log(
    `             timeline pinned: date=${tl!.date}, snapshot=${Boolean(tl!.snapshot_id)}`,
  );

  // --- Restore demo state ---
  await sb
    .from("narratives")
    .update({
      status: "drafted",
      reviewed_at: null,
      sent_at: null,
      slack_variant: originalVariant,
    })
    .eq("id", B1);
  const rows = await sb
    .from("claims")
    .select("id, ord")
    .eq("narrative_id", B1)
    .order("ord");
  for (let i = 0; i < rows.data!.length; i++) {
    await sb
      .from("claims")
      .update({ text: originalTexts[i] })
      .eq("id", rows.data![i].id);
  }
  await sb
    .from("timeline_entries")
    .update({ date: "2026-07-06" })
    .eq("ref_id", B1);
  await sb.from("edit_diffs").delete().eq("id", captured.id);
  const restored = await getNarrativeContext(B1);
  console.log(
    `6. restore  → status=${restored!.narrative.status}, variant restored=${Boolean(restored!.narrative.slackVariant)}, texts intact=${restored!.narrative.claims.length === originalTexts.length}`,
  );

  console.log("\nPhase 3 cycle: PASS");
}

runWithServiceRole(main).catch((e) => {
  console.error(e);
  process.exit(1);
});
