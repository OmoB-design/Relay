import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  getRequestClient,
  hasServiceRoleKey,
  type RelayClient,
} from "@/lib/supabase";
import { ProfileSchema, type Profile } from "@/lib/types";

/* ============================================================================
   Who is signed in, and what they may do.

   INVITE ONLY. There is no public signup. An admin invites a buyer by email;
   Supabase mails a link; the buyer sets a password. Nothing in the app creates
   an account, which is the point — this is an internal tool for one agency.

   THE BOOTSTRAP. Invite-only needs an admin, and a fresh database has none. The
   `handle_new_user` trigger makes the FIRST account an admin (see
   supabase/migrations/0008_auth.sql), so the agency owner signs up once
   and everyone after is invited.

   THE RLS PREDICATES LIVE IN A PRIVATE SCHEMA. PostgREST exposes every function
   in `public` as a REST endpoint, so private.can_access_client() etc. are out of
   reach while still callable from policies — see 0010_harden_definer_functions.

   REVOKE, NEVER DELETE. Access is withdrawn with status = 'revoked' and the
   profile row survives, because the audit trail names it — who confirmed which
   row, who dismissed which flag and why. Deleting the user would orphan all of
   that, so there is deliberately no delete path.
   ========================================================================== */

/** The signed-in profile, or null. Never throws — callers decide what to do. */
export async function currentProfile(): Promise<Profile | null> {
  const sb = await getRequestClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;

  const parsed = ProfileSchema.safeParse({
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    status: data.status,
  });
  return parsed.success ? parsed.data : null;
}

/** For a page that requires a signed-in, active account.
 *
 *  A REVOKED user is signed out rather than shown an error: their session is
 *  still valid as far as Supabase Auth is concerned, and leaving them on a page
 *  full of empty sections would read as a bug rather than as a withdrawal. */
export async function requireProfile(): Promise<Profile> {
  const profile = await currentProfile();
  if (!profile) redirect("/login");
  if (profile.status === "revoked") redirect("/login?revoked=1");
  return profile;
}

/** For a page that requires an admin. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/today");
  return profile;
}

/** The client ids this profile may see. Admins see every client.
 *
 *  RLS already enforces this at the database — this exists so the app can tell
 *  the difference between "no clients assigned to you" and "no clients exist",
 *  which need different words on screen. */
export async function assignedClientIds(
  profile: Profile,
  db?: RelayClient,
): Promise<string[] | "all"> {
  if (profile.role === "admin") return "all";
  const sb = db ?? (await getRequestClient());
  const { data } = await sb
    .from("client_assignments")
    .select("client_id")
    .eq("buyer_id", profile.id);
  return (data ?? []).map((r) => r.client_id);
}

/** The admin API client. Service role, server-only, used for invite and ban.
 *  Kept out of lib/supabase.ts so nothing in the data layer can reach it. */
export function adminAuthClient() {
  if (!hasServiceRoleKey()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — invites and revocation need it. " +
        "Supabase Dashboard → Settings → API → service_role. Server-only: never " +
        "prefix it with NEXT_PUBLIC_.",
    );
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** First name only, for the page header greeting. */
export function firstName(profile: Profile): string {
  const first = profile.name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : profile.email.split("@")[0]!;
}
