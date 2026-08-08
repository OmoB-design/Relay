/* Logo resolution: the SSRF guard, the preference order, and the wiring.
     npx tsx --env-file=.env.local scripts/verify-logos.ts

   THE ONE THAT MATTERS IS THE SSRF GUARD. A domain is typed by a human into a
   form and the SERVER then fetches it. Unguarded, "169.254.169.254" would make
   Relay fetch cloud instance metadata and hand the result back as a picture.
   The checks below are not decoration — they are the reason this feature can
   exist at all.

   It also pins the thing that took the page down the first time a real logo
   landed: next/image THROWS on a remote host that is not allowlisted, so an
   un-configured storage hostname does not degrade to a broken image, it
   white-screens the client workspace. */
import { readFileSync } from "node:fs";
import { resolveLogoFromWebsite } from "../lib/logos/resolve";
import { logoFor } from "../lib/logos";
import { websiteFetchEnabled } from "../lib/logos/store";

const fails: string[] = [];
function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) fails.push(detail ? `${label} — ${detail}` : label);
}

async function refused(target: string): Promise<string | null> {
  try {
    await resolveLogoFromWebsite(target);
    return null; // resolved — which for a private address is the bug
  } catch (e) {
    return e instanceof Error ? e.message : "unknown";
  }
}

async function main() {
  /* ---- SSRF ------------------------------------------------------------- */

  const privates = [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.5.4",
    "192.168.1.1",
    // AWS/GCP instance metadata — the classic SSRF target.
    "169.254.169.254",
  ];
  for (const target of privates) {
    const message = await refused(target);
    check(
      `${target} is refused as private`,
      message !== null && /private address/.test(message),
      message === null
        ? "IT RESOLVED — the guard is not running"
        : `refused, but for the wrong reason: ${message}`,
    );
  }

  /* The guard has to run BEFORE the candidate loop. Inside it, the rejection
     would be swallowed by the per-URL catch and reported as "no logo found" —
     a security control indistinguishable from a missing file. */
  const source = readFileSync("lib/logos/resolve.ts", "utf8");
  const guardLine = source.indexOf("await assertPublicHost(base)");
  const loopLine = source.indexOf("for (const candidate of candidates)");
  check(
    "the host check runs before the candidate loop, not inside it",
    guardLine > 0 && loopLine > 0 && guardLine < loopLine,
  );

  for (const target of ["localhost", "not-a-domain", "http://x"]) {
    const message = await refused(target);
    check(`"${target}" is refused as not a domain`, message !== null);
  }

  /* ---- Preference order ------------------------------------------------- */

  check(
    "a stored logo beats the hand-mapped demo asset",
    logoFor({ name: "Northbrook", logoUrl: "https://example.test/a.png" }) ===
      "https://example.test/a.png",
    "otherwise a real logo would lose to config.clientLogos on any screen " +
      "that was missed",
  );
  check(
    "…and the demo asset is still the fallback",
    logoFor({ name: "Northbrook" }) !== undefined,
  );
  check(
    "a client with neither gets nothing, and ClientAvatar draws initials",
    logoFor({ name: "No Such Client" }) === undefined,
  );

  /* ---- Wiring ----------------------------------------------------------- */

  const nextConfig = readFileSync("next.config.mjs", "utf8");
  check(
    "next/image is told about the storage host",
    /remotePatterns/.test(nextConfig) &&
      /NEXT_PUBLIC_SUPABASE_URL/.test(nextConfig),
    "next/image THROWS on an unlisted host — the page white-screens rather " +
      "than showing a broken image",
  );
  check(
    "…and derives it from env rather than hardcoding a project ref",
    !/[a-z]{20}\.supabase\.co/.test(nextConfig),
    "a hardcoded ref works everywhere it is tested and fails on deploy",
  );

  check(
    "automatic website lookup is on by default",
    websiteFetchEnabled(),
    "set RELAY_LOGO_FETCH=off to disable; it is the only automatic source " +
      "until the Google Ads connector lands",
  );

  /* ---- And it actually works against a real site ------------------------ */

  try {
    const found = await resolveLogoFromWebsite("shopify.com");
    check(
      `a real brand resolves (${found.contentType}, ${(found.bytes.byteLength / 1024).toFixed(1)} KB)`,
      found.bytes.byteLength > 100 && found.contentType.startsWith("image/"),
    );
  } catch (e) {
    // Network-dependent, so this is a warning rather than a failure — a CI box
    // with no egress should not fail the suite over it.
    console.log(
      `  ~ live lookup skipped: ${e instanceof Error ? e.message : e}`,
    );
  }
}

main().then(() => {
  console.log(
    fails.length
      ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
      : "\n✓ private addresses refused, preference order holds, image host wired\n",
  );
  process.exit(fails.length ? 1 : 0);
});
