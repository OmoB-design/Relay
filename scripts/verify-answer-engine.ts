/* Phase 8 proof. Without ANTHROPIC_API_KEY: asserts the deterministic
   fallback stands (the desk never depends on the key) and SKIPS the live
   half. With a key: asks a grounded question and a nonsense question for a
   real client and asserts the contract - grounded answers cite only real
   snapshot items, misses cite nothing and say so, confidence labels are
   server-built. */
import { format, parseISO } from "date-fns";
import { generateAnswer, hasAnthropicKey } from "../lib/answer-engine";
import {
  getClients,
  getDailyRowsForClient,
  getLatestSnapshot,
} from "../lib/data";
import { runWithServiceRole } from "../lib/supabase";

async function main() {
  const answered = await runWithServiceRole(async () => {
    const clients = await getClients();
    const northbrook = clients.find((c) => c.name === "Northbrook")!;
    const [snapshot, rows] = await Promise.all([
      getLatestSnapshot(northbrook.id),
      getDailyRowsForClient(northbrook.id, 14),
    ]);
    const throughLabel = snapshot
      ? format(parseISO(snapshot.asOf), "MMM d")
      : "today";
    const ctx = {
      profile: northbrook,
      snapshot: snapshot ?? null,
      rows,
      throughLabel,
    };

    const grounded = await generateAnswer({
      ...ctx,
      question: "How is spend pacing against the weekly target?",
    });
    const nonsense = await generateAnswer({
      ...ctx,
      question: "What is the meaning of life and our TikTok CPM?",
    });
    return { grounded, nonsense, snapshot };
  });

  const { grounded, nonsense, snapshot } = answered;
  console.log("grounded.grounded:", grounded.grounded, "| refs:", grounded.evidenceRefs.length);
  console.log("grounded.text:", grounded.text.slice(0, 110));
  console.log("nonsense.grounded:", nonsense.grounded, "| refs:", nonsense.evidenceRefs.length);

  // Contract assertions that hold for BOTH engines:
  const citable = new Set(snapshot?.items.map((i) => i.id) ?? []);
  for (const ref of grounded.evidenceRefs) {
    if (!citable.has(ref.itemId)) throw new Error(`Cited unknown item ${ref.itemId}`);
  }
  if (nonsense.grounded) throw new Error("Nonsense question answered as grounded.");
  if (nonsense.evidenceRefs.length !== 0) throw new Error("Miss card cites evidence.");
  if (!grounded.confidenceLabel.startsWith("Based on")) {
    throw new Error("Confidence label not server-shaped.");
  }

  console.log(
    hasAnthropicKey()
      ? "live engine ok"
      : "SKIP live half: ANTHROPIC_API_KEY not present - deterministic fallback verified.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
