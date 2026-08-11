import { createHash } from "node:crypto";

/* Refuse a password that is already in a public breach corpus.
 *
 *  WHY THIS IS IN THE APP AND NOT A TOGGLE. Supabase has exactly this feature,
 *  and it is gated to the Pro plan. The gap it leaves is not theoretical: the
 *  password rules configured on this project (8+ chars, one of each of
 *  lowercase / uppercase / digit / symbol) reject `password`, and accept
 *  `Passw0rd!` — which appears in the HaveIBeenPwned corpus 175,727 times.
 *  `Qwerty123!` passes too, at 184,730. Composition rules push people toward
 *  precisely those shapes, so the rules and the risk point the same way.
 *
 *  K-ANONYMITY: THE PASSWORD NEVER LEAVES THIS PROCESS. It is hashed with
 *  SHA-1, and only the first FIVE characters of the hash are sent. HIBP returns
 *  every suffix sharing that prefix — hundreds of hashes — and the comparison
 *  happens here. The service cannot tell which of them was being asked about,
 *  and learns nothing about the account it belongs to.
 *
 *  SHA-1 is not a security choice: it is the corpus's index. Nothing is being
 *  protected by it, and the hash of a password we already hold in memory
 *  discloses nothing we do not have.
 *
 *  IT FAILS OPEN, DELIBERATELY. If HIBP is unreachable or slow, this returns 0
 *  and the password is allowed. The alternative is that a third party's outage
 *  stops a new colleague from finishing their invite — turning a nice-to-have
 *  check into a hard dependency on someone else's uptime. A breached password
 *  is a risk; an agency that cannot onboard is an outage. */

const ENDPOINT = "https://api.pwnedpasswords.com/range";
const TIMEOUT_MS = 2_500;

/** How many times this password appears in known breaches. 0 means unseen —
 *  and also means "we could not check", which is why the caller must treat
 *  this as advice rather than as proof of safety. */
export async function breachCount(password: string): Promise<number> {
  const hash = createHash("sha1")
    .update(password, "utf8")
    .digest("hex")
    .toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await fetch(`${ENDPOINT}/${prefix}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Ask for the padded response: HIBP returns a random number of decoy
      // entries so the RESPONSE SIZE cannot hint at how common the prefix is.
      headers: { "Add-Padding": "true" },
      cache: "no-store",
    });
    if (!response.ok) return 0;

    for (const line of (await response.text()).split("\n")) {
      const [candidate, count] = line.trim().split(":");
      if (candidate === suffix) {
        const n = Number(count);
        // Padding entries are returned with a count of 0.
        return Number.isFinite(n) ? n : 0;
      }
    }
    return 0;
  } catch {
    return 0; // Unreachable or timed out — see "fails open" above.
  }
}
