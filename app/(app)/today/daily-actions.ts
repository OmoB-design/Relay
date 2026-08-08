"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { confirmDailyRow } from "@/lib/data";
import { compileDaily } from "@/lib/daily/compile";

/* The morning ritual's two actions. Confirming the numbers IS reviewing the
   day — one judgement, one action. Changing a pulled figure captures a reason,
   the same discipline the agency applies when flagging a correction. */

const ConfirmInput = z.object({
  rowId: z.string().uuid(),
  metrics: z
    .object({
      spend: z.number().optional(),
      sales: z.number().optional(),
      revenue: z.number().optional(),
      roas: z.number().optional(),
      cpa_cpo: z.number().optional(),
      nc_roas: z.number().optional(),
      ncac: z.number().optional(),
      nvp: z.number().optional(),
    })
    .optional(),
  overrideReason: z.string().trim().optional(),
});

export async function confirmDailyRowAction(
  input: z.infer<typeof ConfirmInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = ConfirmInput.parse(input);
  /* The attester comes from the SESSION, never from the request body. A server
     action is a public endpoint; letting the caller name who confirmed a row
     would make the whole accountability trail forgeable. */
  const me = await requireProfile();
  try {
    await confirmDailyRow({ ...p, confirmedBy: me });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't confirm.",
    };
  }
  revalidatePath("/today");
  return { ok: true };
}

/** Manual re-run of the nightly compile — the same function the cron calls. */
export async function recompileAction() {
  await compileDaily();
  revalidatePath("/today");
}
