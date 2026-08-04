/* Amendment proof: unreview (reviewed → drafted) + immutability guards.
   Uses Birkenstock b2; captures its exact row first and restores it verbatim. */
import { getSupabase } from "../lib/supabase";
import { runWithServiceRole } from "../lib/supabase";
import { getNarrativeContext, unreviewNarrative } from "../lib/data";
const B2 = "11111111-0000-4000-8000-0000000000b2";
async function main() {
  const sb = await getSupabase();
  const { data: original } = await sb
    .from("narratives")
    .select("status, reviewed_at, sent_at")
    .eq("id", B2)
    .single();
  console.log("original:", original!.status);

  // sent is immutable: unreview must be a no-op
  await unreviewNarrative(B2);
  let n = (await getNarrativeContext(B2))!.narrative;
  console.log(
    "unreview on sent (guard):",
    n.status,
    "— unchanged:",
    n.status === "sent",
  );

  // stage a reviewed state, then unreview for real
  await sb
    .from("narratives")
    .update({ status: "reviewed", sent_at: null })
    .eq("id", B2);
  await unreviewNarrative(B2);
  n = (await getNarrativeContext(B2))!.narrative;
  console.log(
    "unreview on reviewed:",
    n.status,
    "· reviewedAt cleared:",
    !n.reviewedAt,
  );

  // restore the user's actual state verbatim
  await sb.from("narratives").update(original!).eq("id", B2);
  n = (await getNarrativeContext(B2))!.narrative;
  console.log("restored:", n.status, "· sentAt intact:", Boolean(n.sentAt));
}
runWithServiceRole(main).catch((e) => {
  console.error(e);
  process.exit(1);
});
