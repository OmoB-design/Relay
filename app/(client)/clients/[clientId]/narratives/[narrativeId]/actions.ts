"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  markReviewed,
  saveDraftEdits,
  sendNarrative,
  unreviewNarrative,
} from "@/lib/data";

/* NarrativeSplitView actions. Voice-profile capture happens inside
   saveDraftEdits (lib/data.ts) — silently, per design.md §4.3. */

function revalidate(clientId: string, narrativeId: string) {
  revalidatePath(`/clients/${clientId}/narratives/${narrativeId}`);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/today");
}

const SaveDraftInput = z.object({
  clientId: z.string().uuid(),
  narrativeId: z.string().uuid(),
  paragraphs: z.array(z.string()).min(1),
});

export async function saveDraftAction(
  input: z.infer<typeof SaveDraftInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = SaveDraftInput.parse(input);
  try {
    await saveDraftEdits(p.narrativeId, p.paragraphs);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed." };
  }
  revalidate(p.clientId, p.narrativeId);
  return { ok: true };
}

export async function markReviewedAction(clientId: string, narrativeId: string) {
  await markReviewed(z.string().uuid().parse(narrativeId));
  revalidate(clientId, narrativeId);
}

export async function sendNarrativeAction(clientId: string, narrativeId: string) {
  await sendNarrative(z.string().uuid().parse(narrativeId));
  revalidate(clientId, narrativeId);
}

export async function unreviewAction(clientId: string, narrativeId: string) {
  await unreviewNarrative(z.string().uuid().parse(narrativeId));
  revalidate(clientId, narrativeId);
}
