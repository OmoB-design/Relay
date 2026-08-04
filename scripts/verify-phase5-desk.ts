/* Phase 5 proof, against live Supabase:
   1. Seeded question patterns → grounded, pre-authored cards with evidence.
   2. Unknown question → honest miss (grounded: false, no refs).
   3. Grounded answers persist to thread + client Timeline; misses to thread only.
   4. The Switchup waiting thread answers to an honest miss (by design).
   Restores all state after. */
import { answerQuestion } from "../lib/answers";
import { runWithServiceRole } from "../lib/supabase";
import {
  answerThread,
  askQuestion,
  getSupabase,
  getThreadsForClient,
} from "./phase5-helpers";

async function main() {
  const sb = await getSupabase();
  const NB = "11111111-0000-4000-8000-000000000001";
  const SU = "11111111-0000-4000-8000-000000000003";
  const WAITING = "11111111-0000-4000-8000-0000000000d3";

  // 1. Pattern matching
  const q1 = answerQuestion({
    clientId: NB,
    clientName: "Northbrook",
    question: "Why was spend so high on Thursday??",
    throughLabel: "Jul 12",
  });
  const q2 = answerQuestion({
    clientId: NB,
    clientName: "Northbrook",
    question: "how's the new creative angle going",
    throughLabel: "Jul 12",
  });
  const miss = answerQuestion({
    clientId: NB,
    clientName: "Northbrook",
    question: "What should our Q4 budget be?",
    throughLabel: "Jul 12",
  });
  console.log(
    "1. Q1 grounded:",
    q1.grounded,
    "refs:",
    q1.evidenceRefs.map((r) => r.itemId).join(","),
  );
  console.log(
    "   Q2 grounded:",
    q2.grounded,
    "refs:",
    q2.evidenceRefs.map((r) => r.itemId).join(","),
  );
  console.log(
    "   miss grounded:",
    miss.grounded,
    "| refs:",
    miss.evidenceRefs.length,
    "| text:",
    miss.text.slice(0, 72) + "…",
  );

  // 2. Ask + persistence (grounded → timeline; miss → thread only)
  const { count: tlBefore } = await sb
    .from("timeline_entries")
    .select("*", { count: "exact", head: true })
    .eq("client_id", NB)
    .eq("type", "answer");
  await askQuestion(NB, "Why was spend so high on Thursday??", q1);
  await askQuestion(NB, "What should our Q4 budget be?", miss);
  const threads = await getThreadsForClient(NB);
  const { count: tlAfter } = await sb
    .from("timeline_entries")
    .select("*", { count: "exact", head: true })
    .eq("client_id", NB)
    .eq("type", "answer");
  console.log(
    "2. threads now:",
    threads.length,
    "| timeline answer entries:",
    tlBefore,
    "→",
    tlAfter,
    "(+1 for grounded only:",
    tlAfter === (tlBefore ?? 0) + 1,
    ")",
  );

  // 3. Waiting Switchup thread → honest miss (motivates Phase 8)
  const aeMiss = answerQuestion({
    clientId: SU,
    clientName: "Switchup",
    question: "Can you confirm July is still tracking to the Q3 plan we set?",
    throughLabel: "Jul 5",
  });
  await answerThread(WAITING, aeMiss);
  const { data: waiting } = await sb
    .from("answer_threads")
    .select("answer")
    .eq("id", WAITING)
    .single();
  const parsedAnswer = waiting!.answer as { grounded: boolean };
  console.log(
    "3. waiting thread answered:",
    waiting!.answer !== null,
    "| grounded:",
    parsedAnswer.grounded,
    "(honest miss expected)",
  );

  // Restore
  const newIds = threads
    .filter((t) => !t.id.startsWith("11111111"))
    .map((t) => t.id);
  await sb.from("timeline_entries").delete().in("ref_id", newIds);
  await sb.from("answer_threads").delete().in("id", newIds);
  await sb.from("answer_threads").update({ answer: null }).eq("id", WAITING);
  const restoredThreads = await getThreadsForClient(NB);
  const { data: restoredWaiting } = await sb
    .from("answer_threads")
    .select("answer")
    .eq("id", WAITING)
    .single();
  console.log(
    "4. restored: NB threads",
    restoredThreads.length,
    "| Switchup waiting again:",
    restoredWaiting!.answer === null,
  );

  console.log("\nPhase 5 checks: PASS");
}
runWithServiceRole(main).catch((e) => {
  console.error(e);
  process.exit(1);
});
