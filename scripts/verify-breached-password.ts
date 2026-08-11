/* The breached-password check, proved against the real corpus.
     npx tsx --env-file=.env.local scripts/verify-breached-password.ts

   WHY IT EXISTS AT ALL. Supabase ships this feature and gates it to the Pro
   plan, so the toggle in the dashboard is greyed out on this project. What is
   left is the composition rules — 8+ characters, one of each of lowercase,
   uppercase, digit and symbol — and those reject `password` while accepting
   `Passw0rd!`, which appears in the corpus 175,727 times. Composition rules
   push people toward exactly that shape, so the rules and the risk point the
   same way. This closes it in the app instead.

   THE FAIL-OPEN CASE IS DELIBERATE and is asserted here rather than left to be
   discovered: if HIBP is unreachable the password is ALLOWED, because a third
   party's outage must not stop a new colleague finishing their invite. */
import { readFileSync } from "node:fs";
import { breachCount } from "../lib/breached-password";

const fails: string[] = [];

function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) fails.push(detail ? `${label} — ${detail}` : label);
}

/** Passwords that satisfy this project's Supabase rules and are still awful. */
const COMPLIANT_BUT_BREACHED = ["Passw0rd!", "Qwerty123!", "Summer2024!"];

async function main() {
  /* ---- the source is actually wired in ---------------------------------- */
  const action = readFileSync("app/(auth)/login/actions.ts", "utf8");
  check(
    "setPasswordAction consults the breach corpus",
    /await breachCount\(password\)/.test(action),
    "the check exists but nothing calls it",
  );
  check(
    "…and refuses when the count is non-zero",
    /breachCount\(password\)\) > 0/.test(action),
    "a check whose result is ignored is not a check",
  );

  const lib = readFileSync("lib/breached-password.ts", "utf8");
  check(
    "only the first five hash characters are sent",
    /hash\.slice\(0, 5\)/.test(lib) && /\$\{ENDPOINT\}\/\$\{prefix\}/.test(lib),
    "sending the whole hash would hand HIBP the password's identity",
  );
  check(
    "padding is requested",
    /"Add-Padding": "true"/.test(lib),
    "without it the response SIZE leaks how common the prefix is",
  );

  /* ---- the real corpus --------------------------------------------------- */
  for (const password of COMPLIANT_BUT_BREACHED) {
    const n = await breachCount(password);
    check(
      `"${password}" is caught (${n.toLocaleString()} breaches)`,
      n > 0,
      "this passes the configured composition rules, so nothing else stops it",
    );
  }

  /* A password of the same SHAPE that is not in the corpus must pass, or the
     check is just a random denial. */
  const fresh = `Relay${Date.now().toString(36)}Zx9!`;
  check(
    "an unbreached password of the same shape is allowed",
    (await breachCount(fresh)) === 0,
    "the check is rejecting on shape rather than on the corpus",
  );

  /* ---- fails open --------------------------------------------------------- */
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("network down");
  }) as typeof fetch;
  try {
    check(
      "an unreachable HIBP allows the password rather than blocking setup",
      (await breachCount("Passw0rd!")) === 0,
      "a third party's outage would stop every new colleague finishing their invite",
    );
  } finally {
    globalThis.fetch = realFetch;
  }
}

main()
  .then(() => {
    console.log(
      fails.length
        ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
        : "\n✓ breached passwords refused, unbreached allowed, outage non-blocking\n",
    );
    process.exit(fails.length ? 1 : 0);
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
