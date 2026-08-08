/* A signed-in cookie for a given buyer, for looking at the app as they see it.
   Dev only — it mints a real session.
     npx tsx --env-file=.env.local scripts/buyer-cookie.ts buyer@example.com */
import { adminAuthClient } from "../lib/auth";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function main() {
  const admin = adminAuthClient();
  let email = process.argv[2];
  if (!email) {
    const { data } = await admin
      .from("profiles").select("email").eq("role", "buyer").eq("status", "active").limit(1);
    email = data?.[0]?.email;
  }
  if (!email) throw new Error("No active buyer to sign in as.");
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink", email, options: { redirectTo: `${BASE}/auth/callback` },
  });
  if (error) throw error;
  const loc = (await fetch(data.properties.action_link, { redirect: "manual" })).headers.get("location") ?? "";
  const p = new URLSearchParams(loc.split("#")[1] ?? "");
  const res = await fetch(`${BASE}/auth/callback/session`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ access_token: p.get("access_token"), refresh_token: p.get("refresh_token") }),
    redirect: "manual",
  });
  console.log(res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; "));
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
