"use server";

import { revalidatePath } from "next/cache";
import { adminAuthClient, requireAdmin } from "@/lib/auth";
import { getRequestClient } from "@/lib/supabase";

/* Admin actions. Every one re-checks `requireAdmin()` on the server, because a
   server action is a public endpoint — hiding a button proves nothing. RLS
   refuses the write as well, so these are two independent locks, not one. */

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Invite a media buyer by email. Supabase mails the link; the trigger creates
 *  their profile row; they land on /auth/set-password. */
export async function inviteBuyerAction(email: string): Promise<ActionResult> {
  await requireAdmin();
  const address = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { ok: false, error: "That doesn't look like an email address." };
  }

  try {
    const admin = adminAuthClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { error } = await admin.auth.admin.inviteUserByEmail(address, {
      redirectTo: `${origin}/auth/callback?next=/auth/set-password`,
    });
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invite failed.",
    };
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Withdraw or restore access.
 *
 *  Revoking sets status and bans the auth user, so an existing session stops
 *  working rather than lingering until its token expires. The profile row is
 *  never deleted — the audit trail names it. */
export async function setBuyerStatusAction(
  buyerId: string,
  status: "active" | "revoked",
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (buyerId === me.id) {
    return { ok: false, error: "You can't revoke your own access." };
  }

  const sb = await getRequestClient();
  const { error } = await sb
    .from("profiles")
    .update({ status })
    .eq("id", buyerId);
  if (error) return { ok: false, error: error.message };

  try {
    const admin = adminAuthClient();
    await admin.auth.admin.updateUserById(buyerId, {
      // "none" clears the ban; a long duration is Supabase's way of expressing it.
      ban_duration: status === "revoked" ? "876000h" : "none",
    });
  } catch (e) {
    // The profile flag already denies every RLS policy, so access is withdrawn
    // even if the ban call fails. Say so rather than implying nothing happened.
    return {
      ok: false,
      error:
        "Access withdrawn in Relay, but the auth session could not be ended: " +
        (e instanceof Error ? e.message : "unknown error"),
    };
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Assign a client at a permission, or take it away.
 *
 *  Three states, not two. "none" deletes the row — a buyer with no assignment
 *  cannot see the client at all, which is a different thing from seeing it and
 *  not being able to change it. RLS enforces all three (migration 0018); this
 *  is the way an admin expresses them. */
export async function setAssignmentAction(
  clientId: string,
  buyerId: string,
  permission: "none" | "view" | "edit",
): Promise<ActionResult> {
  await requireAdmin();
  const sb = await getRequestClient();

  const { error } =
    permission === "none"
      ? await sb
          .from("client_assignments")
          .delete()
          .eq("client_id", clientId)
          .eq("buyer_id", buyerId)
      : await sb
          .from("client_assignments")
          .upsert(
            { client_id: clientId, buyer_id: buyerId, permission },
            { onConflict: "client_id,buyer_id" },
          );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/today");
  revalidatePath("/clients");
  return { ok: true };
}

/** Stamp "the admin has now seen the team list", clearing the nav marker.
 *
 *  A server action rather than a write during the page's render: rendering a
 *  server component is not allowed to have side effects, and Next may render it
 *  more than once per request. Called from the client once the page is on
 *  screen — which is the only moment that honestly means "seen". */
export async function markTeamSeenAction(): Promise<ActionResult> {
  const me = await requireAdmin();
  const sb = await getRequestClient();
  const { error } = await sb
    .from("profiles")
    .update({ team_seen_at: new Date().toISOString() })
    .eq("id", me.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
