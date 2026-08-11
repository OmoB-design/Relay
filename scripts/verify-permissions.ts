/* view vs edit, proved against the live database with a REAL buyer session.
     npx tsx --env-file=.env.local scripts/verify-permissions.ts

   WHY IT USES A REAL SESSION. Every other way of testing this tests something
   easier. Reading the SQL proves the policy was written; calling the app proves
   the UI hides a button. Neither proves the DATABASE refuses the write, which
   is the only claim that matters — a permission enforced in the UI is a
   suggestion, and the whole point of the spec's line about scoping at the data
   layer is that a buyer cannot get past it with devtools open.

   So this signs in as an actual buyer, over the anon key, exactly as the
   browser would, and tries to write.

   IF THERE IS NO BUYER, IT MAKES ONE. This used to skip, which meant the only
   check that actually tests the security boundary ran only when the agency
   happened to have a second user — and quietly passed the suite when it did
   not. A proof you can't run isn't a proof. The probe account is created with
   the admin API (no email is sent), assigned one client, and deleted at the
   end; deleting the auth user cascades the profile and the assignment with it.

   It restores whatever it changed, including on failure. */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { adminAuthClient } from "../lib/auth";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const fails: string[] = [];

function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) fails.push(detail ? `${label} — ${detail}` : label);
}

/** A supabase client carrying a real buyer's session, over the ANON key —
 *  the same path and the same RLS a browser gets. */
async function sessionFor(email: string) {
  const admin = adminAuthClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${BASE}/auth/callback` },
  });
  if (error) throw error;
  const location =
    (await fetch(data.properties.action_link, { redirect: "manual" })).headers.get(
      "location",
    ) ?? "";
  const token = new URLSearchParams(location.split("#")[1] ?? "").get(
    "access_token",
  );
  if (!token) throw new Error(`No session issued for ${email}.`);
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

function checkSource() {
  /* RLS is the enforcement, but the UI must not OFFER a write it is going to
     lose. These are cheap and they catch the regression where someone drops the
     prop while refactoring and nobody notices, because everything still works
     for the admin and for every buyer who happens to have edit. */
  const today = readFileSync("app/(app)/today/page.tsx", "utf8");
  check(
    "Today computes which clients the reader may edit",
    /getEditableClientIds\(/.test(today) &&
      /buildDigest\(clients, dailyRows, editable\)/.test(today),
  );
  const band = readFileSync("components/relay/DailyDigestBand.tsx", "utf8");
  check(
    "the digest hides Confirm from a view-only reader",
    /canEdit && !confirmed && !editing/.test(band),
  );
  check("…and Edit numbers too", /canEdit &&\s+!confirmed && \(/.test(band));
}

/** A throwaway buyer. `email_confirm` means no invite mail is ever sent, and
 *  the address is on the IETF's reserved example.com, which cannot receive. */
const PROBE_EMAIL = "relay-rls-probe@example.com";

type Admin = ReturnType<typeof adminAuthClient>;

async function provisionProbeBuyer(admin: Admin) {
  // A leftover from an interrupted run would collide on the unique email.
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", PROBE_EMAIL)
    .maybeSingle();
  if (existing) await admin.auth.admin.deleteUser(existing.id);

  const { data, error } = await admin.auth.admin.createUser({
    email: PROBE_EMAIL,
    email_confirm: true,
    user_metadata: { name: "RLS probe" },
  });
  if (error) throw error;
  const id = data.user.id;

  /* handle_new_user() already made the profile a buyer — this is belt and
     braces against the bootstrap branch, which would make it an ADMIN on an
     empty database and turn every assertion below green for the wrong reason. */
  await admin
    .from("profiles")
    .update({
      role: "buyer",
      status: "active",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", id);
  return id;
}

async function main() {
  checkSource();
  const admin = adminAuthClient();

  /* Whatever client is used must have a daily row, because "can they write"
     needs something to write to. Pick the rows first, then a buyer who can
     reach one. */
  const { data: candidateRows } = await admin
    .from("daily_rows")
    .select("id, client_id")
    .order("date", { ascending: false })
    .limit(500);

  if (!candidateRows?.length) {
    console.log("  ~ no daily rows in this database — skipping the live half");
    return;
  }

  /* Prefer a real buyer who ALREADY carries a client: that exercises the true
     production shape. Falling back to a probe covers the case this script kept
     tripping over — an instance whose only buyer has not been assigned
     anything yet, where the honest options are "make an account" or "test
     nothing", and testing nothing is how a broken policy ships. Never fabricate
     an assignment on a real account; handing a buyer a client they were not
     given is a data change, not a test. */
  const { data: liveAssignments } = await admin
    .from("client_assignments")
    .select("client_id, buyer_id, permission, profiles!inner(email, role, status)");

  const usable = (liveAssignments ?? []).find(
    (a) =>
      (a.profiles as unknown as { role: string; status: string }).role ===
        "buyer" &&
      (a.profiles as unknown as { status: string }).status === "active" &&
      candidateRows.some((r) => r.client_id === a.client_id),
  );

  let buyer: { id: string; email: string };
  let probeId: string | null = null;
  let clientId: string;
  let original: string | null = null;

  if (usable) {
    buyer = {
      id: usable.buyer_id,
      email: (usable.profiles as unknown as { email: string }).email,
    };
    clientId = usable.client_id;
    original = usable.permission;
  } else {
    probeId = await provisionProbeBuyer(admin);
    buyer = { id: probeId, email: PROBE_EMAIL };
    clientId = candidateRows[0]!.client_id;
    await admin
      .from("client_assignments")
      .insert({ client_id: clientId, buyer_id: probeId, permission: "edit" });
    console.log(`  · no assigned buyer to borrow — provisioned ${PROBE_EMAIL}`);
  }

  const row = candidateRows.find((r) => r.client_id === clientId)!;

  // A client they are NOT assigned to, for the outer boundary.
  const { data: others } = await admin
    .from("clients")
    .select("id, name")
    .neq("id", clientId)
    .limit(1);
  const other = others?.[0];

  const setPermission = (p: "view" | "edit") =>
    admin
      .from("client_assignments")
      .update({ permission: p })
      .eq("buyer_id", buyer.id)
      .eq("client_id", clientId);

  try {
    /* ---- edit ----------------------------------------------------------- */
    await setPermission("edit");
    let sb = await sessionFor(buyer.email);

    const readAsEditor = await sb
      .from("daily_rows")
      .select("id")
      .eq("id", row.id)
      .maybeSingle();
    check("edit: the buyer can read their client's rows", Boolean(readAsEditor.data));

    const writeAsEditor = await sb
      .from("daily_rows")
      .update({ compiled_at: new Date().toISOString() })
      .eq("id", row.id)
      .select("id");
    check(
      "edit: the buyer can write them",
      !writeAsEditor.error && (writeAsEditor.data?.length ?? 0) === 1,
      writeAsEditor.error?.message ?? "the update matched no rows",
    );

    /* ---- view ------------------------------------------------------------ */
    await setPermission("view");
    sb = await sessionFor(buyer.email);

    const readAsViewer = await sb
      .from("daily_rows")
      .select("id")
      .eq("id", row.id)
      .maybeSingle();
    check(
      "view: the buyer can STILL read their client's rows",
      Boolean(readAsViewer.data),
      "a view-only buyer who cannot see the client is not view-only, it is unassigned",
    );

    /* An UPDATE denied by RLS does not error — it matches zero rows. Checking
       only for an error would have passed against a policy that does nothing. */
    const writeAsViewer = await sb
      .from("daily_rows")
      .update({ compiled_at: new Date().toISOString() })
      .eq("id", row.id)
      .select("id");
    check(
      "view: the database REFUSES the write",
      (writeAsViewer.data?.length ?? 0) === 0,
      "the row was updated — a view-only buyer can edit, which is the bug " +
        "this whole migration exists to prevent",
    );

    const insertAsViewer = await sb.from("flags").insert({
      id: crypto.randomUUID(),
      client_id: clientId,
      kind: "anomaly",
      metric_label: "probe",
      delta_label: "probe",
      headline: "probe",
      diagnostic: "probe",
      status: "open",
    });
    check(
      "view: the database refuses an insert too",
      Boolean(insertAsViewer.error),
      "update was covered but insert was not — they are separate policies",
    );

    /* ---- neither --------------------------------------------------------- */
    if (other) {
      const readOther = await sb
        .from("clients")
        .select("id")
        .eq("id", other.id)
        .maybeSingle();
      check(
        `unassigned: ${other.name} is invisible to them`,
        !readOther.data,
        "the outer boundary is unchanged by any of this",
      );
    }
  } finally {
    // Always, even if an assertion above threw.
    if (original) {
      await setPermission(original as "view" | "edit");
      console.log(`  · restored ${buyer.email} to "${original}"`);
    }
    /* If the insert-under-view assertion FAILED, a probe flag is now sitting in
       a real client's list. Clearing it unconditionally is cheaper than
       reasoning about which branch ran. */
    await admin
      .from("flags")
      .delete()
      .eq("client_id", clientId)
      .eq("metric_label", "probe");

    if (probeId) {
      // Cascades the profile and the assignment.
      await admin.auth.admin.deleteUser(probeId);
      const { data: left } = await admin
        .from("profiles")
        .select("id")
        .eq("id", probeId)
        .maybeSingle();
      check(
        "the probe account left nothing behind",
        !left,
        "a test fixture is still in the profiles table",
      );
    }
  }
}

main()
  .then(() => {
    console.log(
      fails.length
        ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
        : "\n✓ view reads and cannot write; edit can; unassigned sees nothing\n",
    );
    process.exit(fails.length ? 1 : 0);
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
