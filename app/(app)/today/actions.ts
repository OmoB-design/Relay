"use server";

import { revalidatePath } from "next/cache";
import { dismissFlag } from "@/lib/data";

/** Persist a flag dismissal with its reason, then refresh Today. Reason-capture
 *  is validated in dismissFlag (throws on empty) — the UI blocks empty commits
 *  first, this is the server-side backstop. */
export async function dismissFlagAction(id: string, reason: string) {
  await dismissFlag(id, reason);
  revalidatePath("/today");
}
