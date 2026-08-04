import { diffWords } from "diff";
import { getSupabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import type { EditDiffSegment } from "@/lib/types";

/* ============================================================================
   Voice-profile capture (Phase 3 — silent). Every edit made to a draft between
   `drafted` and `reviewed` is stored as an EditDiff on the buyer's VoiceProfile.
   No UI surfaces this; there is nothing honest to show until Phase 8's
   generation actually consumes the corpus (CLAUDE.md). Word-level diffing —
   narrative edits are prose, not code.
   ========================================================================== */

/** diffWords output → our stored segment shape. */
export function toSegments(before: string, after: string): EditDiffSegment[] {
  return diffWords(before, after).map((part) => ({
    type: part.added ? "added" : part.removed ? "removed" : "unchanged",
    text: part.value,
  }));
}

/** The pilot runs a single demo buyer; real auth is post-MVP. */
async function getOrCreateProfileId(): Promise<string> {
  const sb = await getSupabase();
  const key = config.voice.demoBuyerKey;
  const { data, error } = await sb
    .from("voice_profiles")
    .select("id")
    .eq("buyer_key", key)
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (data) return data.id;
  const id = crypto.randomUUID();
  const { error: insertError } = await sb
    .from("voice_profiles")
    .insert({ id, buyer_key: key });
  if (insertError) throw new Error(`Supabase: ${insertError.message}`);
  return id;
}

/** Store one captured edit. No-op when nothing actually changed. */
export async function captureEditDiff(input: {
  narrativeId: string;
  clientId: string;
  before: string;
  after: string;
}): Promise<void> {
  if (input.before === input.after) return;
  const profileId = await getOrCreateProfileId();
  const { error } = await (await getSupabase()).from("edit_diffs").insert({
    id: crypto.randomUUID(),
    profile_id: profileId,
    narrative_id: input.narrativeId,
    client_id: input.clientId,
    before_text: input.before,
    after_text: input.after,
    segments: toSegments(input.before, input.after),
  });
  if (error) throw new Error(`Supabase: ${error.message}`);
}
