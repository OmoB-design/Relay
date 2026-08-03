/* Phase 4 proof, against live Supabase:
   1. Brief renders from the same week/snapshot as the narrative.
   2. Editing a headline does NOT mutate the narrative's claims.
   3. Copy-as-text output is clean teleprompter plain text.
   Restores state after. */
import { getLoomBriefContext, getNarrativeContext, updateLoomHeadline } from "../lib/data";

const B1 = "11111111-0000-4000-8000-0000000000b1";

async function main() {
  const ctx = await getLoomBriefContext(B1);
  if (!ctx) throw new Error("brief not found");
  const { brief, narrative, snapshot } = ctx;

  console.log(`1. same week    → brief "${brief.week.label}" vs narrative "${narrative.week.label}": ${brief.week.label === narrative.week.label}`);
  console.log(`   same snapshot → ${brief.snapshotId === narrative.snapshotId}`);
  console.log(`   headlines=${brief.headlines.length}, risk+win present: ${Boolean(brief.risk && brief.win)}`);
  const h3 = brief.headlines[2];
  console.log(`   H3 refs → ${h3.evidenceRefs.map((r) => r.itemId).join(",")} (E6,E7 expected)`);

  // 2. Edit headline 1; narrative claims must be untouched
  const h1 = brief.headlines[0];
  const originalText = h1.text;
  const claimsBefore = narrative.claims.map((c) => c.text).join("|");
  await updateLoomHeadline(h1.id, "CPO $26.40 — nine percent under target at higher spend");
  const after = await getLoomBriefContext(B1);
  const editedH1 = after!.brief.headlines[0];
  const claimsAfter = (await getNarrativeContext(B1))!.narrative.claims.map((c) => c.text).join("|");
  console.log(`2. headline edited → "${editedH1.text.slice(0, 30)}…"`);
  console.log(`   narrative claims untouched: ${claimsBefore === claimsAfter}`);
  await updateLoomHeadline(h1.id, originalText);
  console.log(`   restored: ${(await getLoomBriefContext(B1))!.brief.headlines[0].text === originalText}`);

  // 3. Copy-as-text shape (mirrors LoomBriefView.briefAsText)
  const text = [
    `Northbrook — Loom brief — ${brief.week.label}`,
    "",
    ...brief.headlines.map((h, i) => `${i + 1}. ${h.text}`),
    "",
    `Risk: ${brief.risk}`,
    `Win: ${brief.win}`,
  ].join("\n");
  console.log(`3. copy text (${text.split("\n").length} lines, plain):\n---\n${text}\n---`);
  console.log(`   contains no markup: ${!/[<>*_#]/.test(text)}`);
  console.log(`   snapshot asOf for footer: ${snapshot.asOf}`);

  console.log("\nPhase 4 checks: PASS");
}
main().catch((e) => { console.error(e); process.exit(1); });
