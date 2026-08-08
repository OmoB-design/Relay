"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getRequestClient } from "@/lib/supabase";
import { nowIso } from "@/lib/clock";
import { RECONCILED, weekRange } from "@/lib/admin/review";

/* Recording a review. requireAdmin() on the server, as everywhere — reviewing
   your own work is not a review, and hiding a form proves nothing. */

/* partialRecord, NOT record. In zod 4 a record keyed by an enum is EXHAUSTIVE:
   `z.record(z.enum(["spend","sales","revenue"]), z.number())` rejects
   `{ spend: 1 }` for missing the other two. Reconciling spend alone is a real
   review — often the only one anyone has time for — so demanding all three
   silently refused every save, with the failure surfacing as a form that
   simply did nothing. Confirmed both ways before changing it. */
const Numbers = z
  .partialRecord(z.enum(RECONCILED), z.number().nonnegative())
  .optional();

const SaveInput = z.object({
  clientId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Frozen at review time so a later edit to a daily row cannot rewrite what
   *  was signed off. */
  logged: Numbers,
  actual: Numbers,
  status: z.enum(["pending", "verified", "discrepancy"]),
  note: z.string().trim().optional(),
});

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveReviewAction(input: unknown): Promise<SaveResult> {
  const me = await requireAdmin();
  const parsed = SaveInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
  }
  const p = parsed.data;

  /* Mirrors the DB constraint, so the admin gets a sentence instead of a
     Postgres error. Calling something a discrepancy without saying what you
     found helps nobody who reads it later — the same discipline as dismissing
     a flag or overriding a pulled number. */
  if (p.status === "discrepancy" && !p.note) {
    return { ok: false, error: "Say what the discrepancy is before saving it." };
  }

  const { start, end } = weekRange(p.weekStart);
  const sb = await getRequestClient();

  const { error } = await sb.from("weekly_reviews").upsert(
    {
      id: randomUUID(),
      client_id: p.clientId,
      week_start: start,
      week_end: end,
      reviewer_id: me.id,
      status: p.status,
      logged: p.logged ?? {},
      actual: p.actual ?? {},
      note: p.note || null,
      reviewed_at: p.status === "pending" ? null : nowIso(),
    },
    // One review per client per week; saving again edits the first.
    { onConflict: "client_id,week_start" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/overview/review");
  revalidatePath("/overview");
  return { ok: true };
}
