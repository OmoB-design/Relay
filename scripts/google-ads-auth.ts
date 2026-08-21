/* One-time OAuth helper: mints the GOOGLE_ADS_REFRESH_TOKEN.

   Run:  npx tsx --env-file=.env.local scripts/google-ads-auth.ts
   Then: open the printed URL, sign in with the Google account that can see
   your Ads accounts, approve — the token prints HERE in your terminal.
   Paste it into .env.local yourself. Nothing is written to disk.

   Requires GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET (a Desktop-app
   OAuth client — Google permits loopback redirects for those). */
import http from "node:http";

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const PORT = 53682;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/adwords";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Set GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET in .env.local first (Step 2).",
  );
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // force a refresh token even on re-auth
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT);
  const code = url.searchParams.get("code");
  const denied = url.searchParams.get("error");
  if (denied) {
    res.end("Authorization was denied. You can close this tab.");
    console.error(`\nGoogle returned: ${denied}`);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.end("Waiting for Google to redirect here…");
    return;
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT,
      grant_type: "authorization_code",
    }),
  });
  const json = (await tokenRes.json()) as {
    refresh_token?: string;
    error_description?: string;
  };

  if (!json.refresh_token) {
    res.end("Token exchange failed — check the terminal.");
    console.error(`\nExchange failed: ${json.error_description ?? "unknown"}`);
    server.close();
    process.exit(1);
  }

  res.end("Done — the refresh token is in your terminal. Close this tab.");
  console.log("\nYour refresh token (paste into .env.local yourself):\n");
  console.log(`GOOGLE_ADS_REFRESH_TOKEN=${json.refresh_token}\n`);
  server.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log("Open this URL in your browser and approve access:\n");
  console.log(authUrl + "\n");
  console.log(`(listening on ${REDIRECT} for Google's redirect…)`);
});
