/* Walks a real invite from end to end, the way an invited buyer does.
   Needs the dev server running.

     set -a; . ./.env.local; set +a; npx tsx scripts/verify-invite.ts

   WHY THIS EXISTS. The invite flow was broken in a way nothing could catch:
   tsc was clean, the build was green, every file was present and correct. The
   session simply arrived in a URL FRAGMENT, which is never sent to the server, so
   the server-side callback saw an empty query string and bounced every invited
   buyer to /login. The only way to see it is to follow the link and look at where
   the tokens actually land — so that is what this does.

   It creates a throwaway user, follows the real Supabase link, exchanges it for a
   real cookie, loads the real page, and deletes the user again. Nothing is
   mocked, because everything that broke lived in the parts a mock replaces. */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const PROBE = `relay-invite-probe-${process.pid}@example.invalid`;

let failures = 0;
function check(pass: boolean, label: string, detail = "") {
  console.log(`  ${pass ? "✓" : "✗"} ${label.padEnd(52)}${detail}`);
  if (!pass) failures++;
}

/** All Set-Cookie headers folded into one Cookie request header. */
function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "\n✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n" +
        "    set -a; . ./.env.local; set +a\n",
    );
    process.exit(1);
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n── Step 0 · the server is up ─────────────────────────────────");
  let reachable = false;
  try {
    const ping = await fetch(`${BASE}/login`, { redirect: "manual" });
    reachable = ping.status === 200;
  } catch {
    reachable = false;
  }
  check(reachable, "dev server answering on /login", reachable ? "" : `← npm run dev (${BASE})`);
  if (!reachable) {
    console.log("\nNothing else can be checked without the server.\n");
    process.exit(1);
  }

  console.log("\n── Step 1 · the old failure mode is gone ─────────────────────");
  // A bare /auth/callback used to be a route handler that 307'd to
  // /login?error=missing-code. It must now be a page that can read the fragment.
  const bare = await fetch(`${BASE}/auth/callback?next=/auth/set-password`, {
    redirect: "manual",
  });
  check(
    bare.status === 200,
    "/auth/callback renders instead of redirecting",
    `status ${bare.status}${bare.headers.get("location") ? ` → ${bare.headers.get("location")}` : ""}`,
  );

  console.log("\n── Step 2 · Supabase issues the invite ───────────────────────");
  let probeId: string | null = null;
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email: PROBE,
      options: { redirectTo: `${BASE}/auth/callback?next=/auth/set-password` },
    });
    if (error) throw error;
    probeId = data.user?.id ?? null;
    check(Boolean(data.properties.action_link), "invite link generated");
    check(Boolean(probeId), "auth user created by the invite", probeId ?? "");

    // The trigger should have written the profile row already — that is why an
    // invited buyer appears in the team list before opening the email.
    const { data: profile } = await admin
      .from("profiles")
      .select("role, status, accepted_at")
      .eq("id", probeId!)
      .maybeSingle();
    check(profile?.role === "buyer", "profile row created as a buyer");
    check(
      profile?.accepted_at === null,
      "accepted_at is null — shows as Invited, not as staff",
    );

    console.log("\n── Step 3 · following the link, where do tokens land? ────────");
    const verify = await fetch(data.properties.action_link, {
      redirect: "manual",
    });
    const location = verify.headers.get("location") ?? "";
    check(
      verify.status >= 300 && verify.status < 400,
      "Supabase /verify redirects",
      `status ${verify.status}`,
    );
    check(
      location.startsWith(`${BASE}/auth/callback`),
      "lands on /auth/callback",
      location.split("#")[0],
    );

    /* THE BUG, made visible. If the tokens are in the fragment, no server route
       can ever see them — which is exactly why the callback is a client page. */
    const fragment = location.includes("#") ? location.split("#")[1]! : "";
    const params = new URLSearchParams(fragment);
    const inFragment = Boolean(params.get("access_token"));
    check(
      inFragment,
      "session arrives in the URL fragment",
      inFragment ? "← invisible to the server; the client page reads it" : "",
    );

    const access = params.get("access_token");
    const refresh = params.get("refresh_token");
    check(Boolean(access && refresh), "both access and refresh token present");
    if (!access || !refresh) throw new Error("no tokens to continue with");

    console.log("\n── Step 4 · the fragment becomes a session cookie ────────────");
    const session = await fetch(`${BASE}/auth/callback/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ access_token: access, refresh_token: refresh }),
      redirect: "manual",
    });
    check(session.status === 200, "POST /auth/callback/session", `status ${session.status}`);
    const cookie = cookieHeader(session);
    check(cookie.includes("sb-"), "Supabase auth cookie written");

    console.log("\n── Step 5 · the buyer can reach set-password ─────────────────");
    const setPassword = await fetch(`${BASE}/auth/set-password`, {
      headers: { cookie },
      redirect: "manual",
    });
    check(
      setPassword.status === 200,
      "/auth/set-password renders with that cookie",
      `status ${setPassword.status}${setPassword.headers.get("location") ? ` → ${setPassword.headers.get("location")}` : ""}`,
    );
    const html = setPassword.status === 200 ? await setPassword.text() : "";
    check(html.includes("Finish setup"), "the set-a-password form is on the page");

    console.log("\n── Step 6 · and cannot reach it without one ──────────────────");
    const naked = await fetch(`${BASE}/auth/set-password`, {
      redirect: "manual",
    });
    const sentAway = (naked.headers.get("location") ?? "").includes(
      "error=expired-link",
    );
    check(
      naked.status >= 300 && sentAway,
      "no session → /login?error=expired-link",
      `status ${naked.status}`,
    );

    console.log("\n── Step 7 · a junk link fails honestly ───────────────────────");
    const junk = await fetch(`${BASE}/auth/callback/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ access_token: "not.a.token", refresh_token: "x" }),
      redirect: "manual",
    });
    check(junk.status === 401, "a forged token is refused", `status ${junk.status}`);
  } finally {
    if (probeId) {
      await admin.auth.admin.deleteUser(probeId);
      const { data: after } = await admin
        .from("profiles")
        .select("id")
        .eq("id", probeId)
        .maybeSingle();
      console.log(
        `\n  ${after ? "✗" : "✓"} probe user cleaned up${after ? " — LEFTOVER, delete by hand" : ""}`,
      );
      if (after) failures++;
    }
  }

  console.log(
    failures === 0
      ? "\n✓ the invite flow works end to end: link → cookie → set password\n"
      : `\n✗ ${failures} check(s) failed\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
