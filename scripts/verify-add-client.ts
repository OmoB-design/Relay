/* The add-client flow, against the live workbook and live Supabase.
     npx tsx --env-file=.env.local scripts/verify-add-client.ts

   THE FAILURE THIS GUARDS. Ingestion matches a workbook tab to a client by
   string. Get that string wrong and nothing throws: the tab lands in
   `unmatchedTabs`, the client compiles with no data, and at 08:00 the next
   morning Today reports the row as absent — indistinguishable from the agency
   genuinely not having filled the tracker in. It is the same shape as the
   tailwind-merge bug: everything present in the source, nothing wrong at build
   time, wrong only once it runs.

   So the drift check below is the point of this script. It reads the real
   workbook and asserts every client Relay holds still resolves to a tab. */
import {
  NewClientSchema,
  TIMEZONES,
  DAYS,
} from "../lib/clients/new-client";
import { listTrackerTabs } from "../lib/ingestion/read";
import { runWithServiceRole } from "../lib/supabase";
import { getClients } from "../lib/data";

const fails: string[] = [];

function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) fails.push(detail ? `${label} — ${detail}` : label);
}

/* ---- 1. The form contract ------------------------------------------------ */

const VALID = {
  name: "Northbrook",
  trackerTab: "Northbrook",
  sourceOfTruth: "Google Ads",
  currency: "USD",
  accountTimezone: "Asia/Dubai",
  cadence: { primary: "weekly", anchorDay: "mon" },
  channel: "slack",
  buyerIds: [],
};

check("a complete form is accepted", NewClientSchema.safeParse(VALID).success);

check(
  "a nameless client is refused",
  !NewClientSchema.safeParse({ ...VALID, name: "   " }).success,
);
check(
  "a client with no tracker tab is refused",
  !NewClientSchema.safeParse({ ...VALID, trackerTab: "" }).success,
  "without a tab there is nothing to read, and the row reports absent forever",
);

/* A zone Intl cannot resolve makes the compile fall back to the wrong day —
   the Dubai rollover bug, exactly. A closed list is the fix. */
check(
  "an unresolvable timezone is refused",
  !NewClientSchema.safeParse({ ...VALID, accountTimezone: "GMT+4" }).success,
  "GMT+4 is what a person types and what Intl cannot parse",
);
for (const zone of TIMEZONES) {
  let resolves = true;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date());
  } catch {
    resolves = false;
  }
  if (!resolves) check(`${zone} resolves in Intl`, false);
}
check(`all ${TIMEZONES.length} offered timezones resolve in Intl`, true);

// A pasted URL is a paste, not a mistake — keep the host, drop the rest.
const pasted = NewClientSchema.safeParse({
  ...VALID,
  domain: "https://www.Northbrook.com/shop?x=1",
});
check(
  "a pasted URL is reduced to its host",
  pasted.success && pasted.data.domain === "northbrook.com",
  pasted.success ? `got "${pasted.data.domain}"` : "rejected outright",
);
check(
  "a non-domain is refused",
  !NewClientSchema.safeParse({ ...VALID, domain: "not a domain" }).success,
);
check(
  "the anchor day covers the whole week",
  DAYS.length === 7 && DAYS.includes("mon"),
  "Monday is when weekly client updates go out",
);

/* ---- 2. The workbook is readable, cheaply -------------------------------- */

async function main() {
  let tabs: string[] = [];
  let source = "";
  try {
    const listed = await listTrackerTabs();
    tabs = listed.tabs;
    source = listed.source;
    check(
      `the workbook lists its tabs (${source}: ${tabs.length} found)`,
      tabs.length > 0,
    );
  } catch (e) {
    check(
      "the workbook lists its tabs",
      false,
      e instanceof Error ? e.message : "unknown error",
    );
    return;
  }

  /* ---- 3. Nothing has drifted ------------------------------------------- */

  await runWithServiceRole(async () => {
    const clients = await getClients();
    const byTab = new Map(tabs.map((t) => [t.trim().toLowerCase(), t]));

    for (const c of clients) {
      const key = (c.trackerTab ?? c.name).trim().toLowerCase();
      check(
        `${c.name} resolves to a tab (${c.trackerTab ?? `${c.name} — by name`})`,
        byTab.has(key),
        "this client compiles with no data and reports absent every morning",
      );
    }

    // Two clients on one tab means one silently shows the other's numbers.
    const seen = new Map<string, string>();
    for (const c of clients) {
      const key = (c.trackerTab ?? c.name).trim().toLowerCase();
      const first = seen.get(key);
      if (first) {
        check(
          `only one client reads "${key}"`,
          false,
          `${first} and ${c.name} both do`,
        );
      }
      seen.set(key, c.name);
    }
    check("no two clients read the same tab", seen.size === clients.length);

    /* ---- 4. Migration 0013 is in ---------------------------------------- */

    const applied = clients.every((c) => c.trackerTab !== undefined);
    check(
      "migration 0013 is applied (every client records its tracker tab)",
      applied,
      "run supabase/migrations/0013_client_identity.sql in the SQL Editor — " +
        "until then the add-client form cannot insert",
    );
  });
}

main().then(() => {
  console.log(
    fails.length
      ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
      : "\n✓ the add-client contract holds and every client still finds its tab\n",
  );
  process.exit(fails.length ? 1 : 0);
});
