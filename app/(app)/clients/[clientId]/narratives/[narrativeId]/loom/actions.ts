"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateLoomHeadline, updateLoomLine } from "@/lib/data";

const HeadlineInput = z.object({
  clientId: z.string().uuid(),
  narrativeId: z.string().uuid(),
  headlineId: z.string().uuid(),
  text: z.string().trim().min(1),
});

/** Edit a brief headline. Touches loom_headlines only — the narrative's
 *  claims are a separate artifact by design (video vs. text emphasis). */
export async function updateLoomHeadlineAction(
  input: z.infer<typeof HeadlineInput>,
) {
  const p = HeadlineInput.parse(input);
  await updateLoomHeadline(p.headlineId, p.text);
  revalidatePath(`/clients/${p.clientId}/narratives/${p.narrativeId}/loom`);
}

const LineInput = z.object({
  clientId: z.string().uuid(),
  narrativeId: z.string().uuid(),
  briefId: z.string().uuid(),
  field: z.enum(["risk", "win"]),
  text: z.string().trim().min(1),
});

/** Edit the one-sentence risk or win line. */
export async function updateLoomLineAction(input: z.infer<typeof LineInput>) {
  const p = LineInput.parse(input);
  await updateLoomLine(p.briefId, p.field, p.text);
  revalidatePath(`/clients/${p.clientId}/narratives/${p.narrativeId}/loom`);
}
