/* Deletes an auth user outright, with everything that cascades from it.
   DEVELOPMENT AND TESTING ONLY.

     set -a; . ./.env.local; set +a
     npx tsx scripts/delete-user.ts someone@example.com        # dry run
     npx tsx scripts/delete-user.ts someone@example.com --yes  # actually delete

   WHY THIS IS A SCRIPT AND NOT A BUTTON. The product withdraws access with
   status = 'revoked' and keeps the profile row, because the audit trail names it:
   who confirmed which row, who dismissed which flag and why. Deleting the person
   orphans all of that, so there is deliberately no delete path in the app — see
   the note at the top of lib/auth.ts.

   The case this exists for is different: a TEST invite you want to send again to
   the same address. Supabase refuses a second invite while the user still exists,
   and there is no way to un-invite. So this is the tool for taking a test account
   back out, and it stays a script precisely so it cannot be reached by accident.

   WHAT GOES WITH THEM (verified against pg_constraint, not assumed):
     auth.users            → the account itself
     public.profiles       → id references auth.users(id) ON DELETE CASCADE
     public.client_assignments → buyer_id references profiles(id) ON DELETE CASCADE
   No other table has a foreign key to profiles, so nothing else moves. */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

const email = process.argv[2]?.trim().toLowerCase();
const confirmed = process.argv.includes("--yes");

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

async function main() {
  if (!email || !email.includes("@")) {
    fail(
      "Pass the email address to delete:\n" +
        "    npx tsx scripts/delete-user.ts someone@example.com --yes",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.\n" +
        "  set -a; . ./.env.local; set +a",
    );
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // There is no get-user-by-email in the admin API, only a listing.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) fail(`Could not list users: ${listError.message}`);

  const user = list.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    console.log(`\n✓ No auth user with ${email} — nothing to delete.\n`);
    return;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, name, role, status, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: assignments } = await admin
    .from("client_assignments")
    .select("client_id")
    .eq("buyer_id", user.id);

  /* Two queries rather than one embed: lib/database.types.ts is hand-authored and
     declares `Relationships: []`, so `clients(name)` resolves to never. */
  const clientIds = (assignments ?? []).map((a) => a.client_id);
  const { data: clientRows } = clientIds.length
    ? await admin.from("clients").select("id, name").in("id", clientIds)
    : { data: [] };
  const nameById = new Map((clientRows ?? []).map((c) => [c.id, c.name]));

  console.log(`\n── ${email} ─────────────────────────────────────────`);
  console.log(`   auth id        ${user.id}`);
  console.log(`   invited        ${user.invited_at ?? "no (created directly)"}`);
  console.log(`   last sign-in   ${user.last_sign_in_at ?? "never"}`);
  console.log(
    `   profile        ${profile ? `${profile.role} / ${profile.status}${profile.name ? ` / ${profile.name}` : ""}` : "none"}`,
  );
  const covered = clientIds.map((id) => nameById.get(id) ?? id);
  console.log(
    `   assignments    ${covered.length === 0 ? "none" : covered.join(", ")}`,
  );

  /* The one deletion that cannot be undone from inside the app: remove the last
     admin and nobody can invite anybody, including a replacement admin. The
     bootstrap in 0008_auth.sql only fires when profiles is EMPTY, so it would not
     rescue a database that still had buyers in it. */
  if (profile?.role === "admin" && profile.status === "active") {
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("status", "active");
    if ((admins ?? []).length <= 1) {
      fail(
        "This is the only active admin. Deleting it would leave nobody able to " +
          "invite anyone — including a new admin. Promote someone else first.",
      );
    }
  }

  if (!confirmed) {
    console.log(
      "\n   Dry run. Nothing was deleted. Re-run with --yes to go ahead.\n",
    );
    return;
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) fail(`Delete failed: ${deleteError.message}`);

  // Prove the cascade actually fired rather than trusting that it should have.
  const [{ data: profileAfter }, { data: assignmentsAfter }, { data: usersAfter }] =
    await Promise.all([
      admin.from("profiles").select("id").eq("id", user.id).maybeSingle(),
      admin.from("client_assignments").select("client_id").eq("buyer_id", user.id),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  const stillThere = usersAfter?.users.some(
    (u) => u.email?.toLowerCase() === email,
  );
  const clean =
    !profileAfter && (assignmentsAfter ?? []).length === 0 && !stillThere;

  console.log(`\n   ${!stillThere ? "✓" : "✗"} auth user deleted`);
  console.log(`   ${!profileAfter ? "✓" : "✗"} profile row cascaded`);
  console.log(
    `   ${(assignmentsAfter ?? []).length === 0 ? "✓" : "✗"} client assignments cascaded`,
  );
  console.log(
    clean
      ? `\n✓ ${email} is gone. It can be invited again.\n`
      : `\n✗ Something survived the delete. Inspect before re-inviting.\n`,
  );
  if (!clean) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
