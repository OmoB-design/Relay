"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getRequestClient } from "@/lib/supabase";

/* Sign in, sign out, and set a password after an invite.

   There is deliberately NO sign-up action. Relay is invite-only: an admin
   invites by email, Supabase mails the link, and the buyer lands on
   /auth/set-password. Adding a public registration form here would quietly turn
   an internal agency tool into an open one. */

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function signInAction(
  email: string,
  password: string,
): Promise<AuthResult> {
  const sb = await getRequestClient();
  const { error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    // Supabase does not distinguish "no such account" from "wrong password", and
    // neither should we — confirming an address exists is an invitation to guess.
    return { ok: false, error: "That email and password don't match." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const sb = await getRequestClient();
  await sb.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/** Completes an invite: the link signs the user in, then they set a password and
 *  their name. Name is captured here because it is what the header greets. */
export async function setPasswordAction(
  name: string,
  password: string,
): Promise<AuthResult> {
  const trimmed = name.trim();
  if (trimmed.length === 0)
    return { ok: false, error: "Your name is required." };
  if (password.length < 8) {
    return { ok: false, error: "Use at least 8 characters." };
  }

  const sb = await getRequestClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "That invite link has expired. Ask your admin to send another.",
    };
  }

  const { error } = await sb.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };

  // The profile row already exists — the handle_new_user trigger created it when
  // the invite was issued. This fills in the name the buyer just gave, and stamps
  // the moment they actually arrived, which is the only thing that distinguishes
  // them from an invite nobody has opened (see 0012_profile_accepted_at.sql).
  const { error: profileError } = await sb
    .from("profiles")
    .update({ name: trimmed, accepted_at: new Date().toISOString() })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: profileError.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
