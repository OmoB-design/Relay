/* Reports what auth is and isn't configured, in the order it has to happen.
     set -a; . ./.env.local; set +a; npx tsx scripts/verify-auth.ts

   Auth lands in two steps on purpose. The moment RLS is on, anything running
   without a signed-in user is denied — the nightly compile and every CLI script
   — so the tables go in first, auth is proved end to end, and only then does the
   door close. This says exactly which step you are on rather than failing
   opaquely at whichever one is missing.

   Read-only. Writes nothing. */
import { createClient } from "@supabase/supabase-js";
import { hasServiceRoleKey } from "../lib/supabase";

const ok = (b: boolean) => (b ? "✓" : "✗");
const line = (label: string, pass: boolean, detail = "") =>
  console.log(`  ${ok(pass)} ${label.padEnd(46)}${detail}`);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const blockers: string[] = [];

  console.log(
    "\n── Step 0 · environment ──────────────────────────────────────",
  );
  line("NEXT_PUBLIC_SUPABASE_URL", Boolean(url));
  line("NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(anon));
  const service = hasServiceRoleKey();
  line(
    "SUPABASE_SERVICE_ROLE_KEY",
    service,
    service ? "" : "← needed before RLS; the compile and scripts use it",
  );
  line(
    "NEXT_PUBLIC_SITE_URL",
    Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    process.env.NEXT_PUBLIC_SITE_URL ?? "← invite links come back here",
  );
  if (!url || !anon) {
    console.log("\n✗ No Supabase connection. Nothing else can be checked.\n");
    process.exit(1);
  }

  // Deliberately NOT the service client — this script reports on whether the key
  // exists, so it cannot depend on it. Steps 1–3 use the anon key, which is the
  // honest vantage point anyway: it is what a browser has.
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    "\n── Step 1 · tables (0008_auth.sql) ───────────────────────────",
  );
  const profilesTable = await sb.from("profiles").select("id").limit(1);
  const tablesExist = !profilesTable.error;
  line(
    "profiles exists",
    tablesExist,
    tablesExist ? "" : profilesTable.error!.message,
  );
  const assignTable = await sb
    .from("client_assignments")
    .select("client_id")
    .limit(1);
  line("client_assignments exists", !assignTable.error);
  if (!tablesExist) blockers.push("apply supabase/migrations/0008_auth.sql");

  console.log(
    "\n── Step 2 · the bootstrap admin ──────────────────────────────",
  );
  let admins = 0;
  let total = 0;
  if (tablesExist) {
    const all = await sb.from("profiles").select("id, email, role, status");
    total = all.data?.length ?? 0;
    admins = (all.data ?? []).filter(
      (p) => p.role === "admin" && p.status === "active",
    ).length;
    line(
      "at least one active admin",
      admins > 0,
      `${admins} of ${total} profile(s)`,
    );
    for (const p of all.data ?? []) {
      console.log(`      · ${p.email}  ${p.role}  ${p.status}`);
    }
    if (admins === 0) {
      blockers.push(
        "create the first user: Supabase Dashboard → Authentication → Users → " +
          "Add user (tick Auto Confirm). The trigger makes the first one an admin.",
      );
    }
  }

  console.log(
    "\n── Step 3 · RLS (0009_rls.sql) ───────────────────────────────",
  );
  // The honest test is behavioural, not a catalogue lookup: can an ANONYMOUS
  // client read client rows? If it can, RLS is not protecting anything.
  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const leak = await anonClient.from("clients").select("id, name").limit(5);
  const leaked = (leak.data ?? []).length;
  const rlsOn = leaked === 0;
  line(
    "anonymous key cannot read clients",
    rlsOn,
    rlsOn ? "" : `← LEAK: ${leaked} client row(s) readable with the public key`,
  );
  if (!rlsOn) {
    blockers.push(
      "apply supabase/migrations/0009_rls.sql — until then the anon key, which " +
        "ships in the browser bundle, can read every client's numbers",
    );
  }

  console.log(
    "\n── Step 4 · service role still works ─────────────────────────",
  );
  if (service) {
    const svcClient = createClient(
      url,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const svc = await svcClient.from("clients").select("id").limit(1);
    line(
      "compile + scripts can still read",
      !svc.error && (svc.data?.length ?? 0) > 0,
      svc.error?.message ?? "",
    );
  } else {
    line(
      "compile + scripts can still read",
      false,
      "← no service key to test with",
    );
  }

  console.log(
    blockers.length
      ? `\n${blockers.length} step(s) remaining:\n${blockers.map((b, i) => `  ${i + 1}. ${b}`).join("\n")}\n`
      : "\n✓ auth is fully configured: invite-only, admin present, RLS closed\n",
  );
  process.exit(blockers.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
