/* Prints a signed-in ADMIN cookie header, for looking at admin pages the way an
   admin sees them. Dev only — it mints a real session, so it is deliberately
   not wired into anything.

     npx tsx --env-file=.env.local scripts/admin-cookie.ts

   Same route the invite flow takes: generateLink puts the session in the URL
   FRAGMENT, which no server route can read, so the tokens are posted to
   /auth/callback/session and it writes the cookie. See verify-invite.ts. */
import { adminAuthClient } from "../lib/auth";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function main() {
  const admin = adminAuthClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("email")
    .eq("role", "admin")
    .eq("status", "active")
    .limit(1);

  const email = profiles?.[0]?.email;
  if (!email) throw new Error("No active admin profile to sign in as.");

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${BASE}/auth/callback` },
  });
  if (error) throw error;

  const verify = await fetch(data.properties.action_link, {
    redirect: "manual",
  });
  const fragment = (verify.headers.get("location") ?? "").split("#")[1] ?? "";
  const params = new URLSearchParams(fragment);
  const access = params.get("access_token");
  const refresh = params.get("refresh_token");
  if (!access || !refresh) throw new Error("No tokens in the callback fragment.");

  const session = await fetch(`${BASE}/auth/callback/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ access_token: access, refresh_token: refresh }),
    redirect: "manual",
  });
  const cookies = session.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  if (!cookies.includes("sb-")) throw new Error("No auth cookie was written.");
  console.log(cookies);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
