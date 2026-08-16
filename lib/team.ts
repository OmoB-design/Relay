import { currentTeamSeenAt } from "@/lib/auth";
import { getRequestClient } from "@/lib/supabase";

/* Colleagues who have accepted an invite since the admin last opened Team.
   Null team_seen_at means they never have, so on a fresh account everyone
   counts — on first run every colleague is news. Shared by the app shell and
   the narrative workspace shell, which carry the same nav. */
export async function countNewTeamJoins(adminId: string): Promise<number> {
  // Already in hand from the profile read — asking again would be a whole
  // round trip for one column.
  const seenAt = await currentTeamSeenAt();
  const sb = await getRequestClient();

  let q = sb
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "buyer")
    .not("accepted_at", "is", null)
    .neq("id", adminId);
  if (seenAt) q = q.gt("accepted_at", seenAt);

  const { count } = await q;
  return count ?? 0;
}
