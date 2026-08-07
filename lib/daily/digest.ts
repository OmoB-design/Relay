import { config } from "@/lib/config";
import { yesterdayFor } from "@/lib/daily/compile";
import { ROW_ABSENT_KEY, type ClientProfile } from "@/lib/types";
import type { DailyRowWithClient } from "@/lib/data";
import type { DigestEntry } from "@/components/relay/DailyDigestBand";

/* Yesterday's row for every client, or an honest account of why there isn't one.
 *
 * Extracted from the Today page because the admin overview asks the same
 * question and must get the same answer. Two surfaces computing "absent"
 * separately is how they end up disagreeing about whether the agency has a
 * problem — and the whole point of the overview is that the admin can trust it
 * without opening every buyer's Today.
 *
 * THREE DISTINCT ABSENCES, because they need three different responses:
 *   · notCompiled — Relay hasn't looked yet          → re-run the compile
 *   · absent      — Relay looked, the row isn't there → go fill the tracker
 *   · stale       — the newest row is for an older day → investigate
 *
 * `expected` is per client, not per agency: yesterday ends in the ad account's
 * timezone, so a Dubai client rolls over four hours before a London one. */
export function buildDigest(
  clients: ClientProfile[],
  dailyRows: DailyRowWithClient[],
): DigestEntry[] {
  return clients.map((client) => {
    const match = dailyRows.find((d) => d.client.id === client.id);
    const expected = yesterdayFor(client);
    const logo = config.clientLogos[client.name];

    if (!match) {
      return {
        client,
        logo,
        problem: {
          kind: "notCompiled" as const,
          message: `Not compiled for ${expected} yet.`,
        },
      };
    }
    if (match.row.date !== expected) {
      return {
        client,
        logo,
        problem: {
          kind: "stale" as const,
          message: `Newest row is ${match.row.date}, not ${expected}.`,
        },
      };
    }
    // A row staged with no metrics means Relay looked and found nothing.
    const absent = match.row.unavailable[ROW_ABSENT_KEY];
    return absent
      ? { client, logo, problem: { kind: "absent" as const, message: absent } }
      : { client, logo, row: match.row };
  });
}
