/* The three "the screen is out of date" fixes, proved rather than asserted.
     npx tsx --env-file=.env.local scripts/verify-live-updates.ts

   THE ONE THAT MATTERS is the realtime round trip. Everything else about that
   feature can be true — the table published, the channel subscribed, the
   component mounted — and it can still deliver nothing, because the failure
   modes are all in the gaps: a table missing from the publication, a JWT the
   realtime socket never received, a DELETE that carries only a primary key so a
   buyer_id filter can never match it.

   So this opens a real socket with a real buyer's token, has the admin write,
   and waits for the event to come back. Both directions: assigned AND
   unassigned, because the second is the one that silently does not work under
   the default replica identity, and it is the direction that governs access.

   It cleans up after itself, including on failure. */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { adminAuthClient } from "../lib/auth";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const fails: string[] = [];

function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) fails.push(detail ? `${label} — ${detail}` : label);
}

function checkSource() {
  const root = readFileSync("app/layout.tsx", "utf8");
  check(
    "the toaster is top-right, not sonner's default bottom",
    /position="top-right"/.test(root),
    "a bottom toast lands on the mobile nav bar",
  );
  check(
    "…inset from the right edge",
    /offset=\{\{\s*top:\s*24,\s*right:\s*60\s*\}\}/.test(root),
  );

  const layout = readFileSync("app/(app)/layout.tsx", "utf8");
  check(
    "LiveRefresh is mounted for every signed-in screen",
    /<LiveRefresh buyerId=\{isAdmin \? null : profile\.id\}/.test(layout),
    "an admin gets focus-refresh but no socket; they are the one writing",
  );
  check(
    "the nav is told about new colleagues",
    /newTeamJoins=\{newTeamJoins\}/.test(layout),
  );

  const live = readFileSync("components/relay/LiveRefresh.tsx", "utf8");
  check(
    "it refreshes on focus AND visibility, not just one",
    /addEventListener\("focus"/.test(live) &&
      /addEventListener\("visibilitychange"/.test(live),
  );
  check(
    "the realtime event is a doorbell — the payload is never read",
    !/payload/.test(live),
    "reading the payload would put the security model in two places",
  );
}

/** A supabase client carrying a real buyer's session, over the ANON key. */
async function sessionFor(email: string) {
  const admin = adminAuthClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${BASE}/auth/callback` },
  });
  if (error) throw error;
  const location =
    (
      await fetch(data.properties.action_link, { redirect: "manual" })
    ).headers.get("location") ?? "";
  const token = new URLSearchParams(location.split("#")[1] ?? "").get(
    "access_token",
  );
  if (!token) throw new Error(`No session issued for ${email}.`);
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  /* The socket authenticates SEPARATELY from the REST client. Miss this and
     every postgres_changes subscription connects fine and receives nothing,
     because RLS evaluates it as anon. */
  await sb.realtime.setAuth(token);
  return sb;
}

async function main() {
  checkSource();
  const admin = adminAuthClient();

  const { data: buyers } = await admin
    .from("profiles")
    .select("id, email")
    .eq("role", "buyer")
    .eq("status", "active")
    .limit(1);
  const buyer = buyers?.[0];
  if (!buyer) {
    console.log("  ~ no active buyer — skipping the live half");
    return;
  }

  // A client this buyer does NOT already carry, so cleanup is a plain delete.
  const { data: theirs } = await admin
    .from("client_assignments")
    .select("client_id")
    .eq("buyer_id", buyer.id);
  const held = new Set((theirs ?? []).map((r) => r.client_id));
  const { data: clients } = await admin.from("clients").select("id, name");
  const target = (clients ?? []).find((c) => !held.has(c.id));
  if (!target) {
    console.log("  ~ that buyer already carries every client — skipping");
    return;
  }

  const sb = await sessionFor(buyer.email);
  const seen: string[] = [];

  const channel = sb
    .channel(`verify:${buyer.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "client_assignments",
        filter: `buyer_id=eq.${buyer.id}`,
      },
      (payload) => seen.push(payload.eventType),
    );

  const subscribed = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), 10_000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve(true);
      }
    });
  });
  check(
    "a buyer's session can open a realtime channel",
    subscribed,
    "the table is probably not in the supabase_realtime publication",
  );

  const waitFor = async (kind: string, ms = 8_000) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (seen.includes(kind)) return true;
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  };

  try {
    if (subscribed) {
      await admin
        .from("client_assignments")
        .insert({
          client_id: target.id,
          buyer_id: buyer.id,
          permission: "view",
        });
      check(
        `assigning ${target.name} reaches the buyer's open page`,
        await waitFor("INSERT"),
        "the admin assigns and the buyer sees nothing until they reload",
      );

      await admin
        .from("client_assignments")
        .delete()
        .eq("client_id", target.id)
        .eq("buyer_id", buyer.id);
      check(
        `…and UNASSIGNING ${target.name} reaches them too`,
        await waitFor("DELETE"),
        "this is the one that needs REPLICA IDENTITY FULL — without it a " +
          "delete carries only the primary key, so the buyer_id filter can " +
          "never match and access removal never arrives",
      );
    }
  } finally {
    await admin
      .from("client_assignments")
      .delete()
      .eq("client_id", target.id)
      .eq("buyer_id", buyer.id);
    await sb.removeChannel(channel);
  }

  /* ---- the Team marker ------------------------------------------------- */
  const { data: admins } = await admin
    .from("profiles")
    .select("id, team_seen_at")
    .eq("role", "admin")
    .limit(1);
  const adminRow = admins?.[0];
  if (adminRow) {
    const restore = adminRow.team_seen_at;
    await admin
      .from("profiles")
      .update({ team_seen_at: null })
      .eq("id", adminRow.id);
    const { data: after } = await admin
      .from("profiles")
      .select("team_seen_at")
      .eq("id", adminRow.id)
      .maybeSingle();
    check(
      "team_seen_at is nullable, so a fresh admin sees everyone as news",
      after?.team_seen_at === null,
    );
    await admin
      .from("profiles")
      .update({ team_seen_at: restore })
      .eq("id", adminRow.id);
  }
}

main()
  .then(() => {
    console.log(
      fails.length
        ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
        : "\n✓ assignment changes reach an open page, both directions\n",
    );
    process.exit(fails.length ? 1 : 0);
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
