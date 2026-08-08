"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getRequestClient } from "@/lib/supabase";
import { listTrackerTabs } from "@/lib/ingestion/read";
import {
  NewClientSchema,
  type ActionResult,
  type TrackerTabsResult,
} from "@/lib/clients/new-client";

/* Creating a client. Like every other admin action these re-check requireAdmin()
   on the server — a server action is a public endpoint, and hiding a button
   proves nothing. RLS refuses the write as well, so that is two independent
   locks rather than one.

   The schema and the result types live in lib/clients/new-client.ts because a
   "use server" module may only export async functions. */

/** The workbook's tab names, for the form to check a client against.
 *
 *  This is what lets the form catch a typo at 14:00 rather than the digest
 *  reporting "no tracker row" at 08:00 the next morning: a tab name that does
 *  not exist matches no client, and an unmatched client compiles with no data. */
export async function trackerTabsAction(): Promise<
  ActionResult<TrackerTabsResult>
> {
  await requireAdmin();
  try {
    const { tabs, source } = await listTrackerTabs();
    const sb = await getRequestClient();

    /* Fall back to names alone when tracker_tab is not there yet. Selecting a
       column that does not exist fails the whole query, and the failure looked
       exactly like "no client claims any tab" — so before migration 0013 the
       form cheerfully offered a tab another client already reads. */
    let rows: { name: string; tracker_tab?: string | null }[] = [];
    const withTab = await sb.from("clients").select("name, tracker_tab");
    if (withTab.error) {
      const namesOnly = await sb.from("clients").select("name");
      rows = namesOnly.data ?? [];
    } else {
      rows = withTab.data ?? [];
    }

    const claimed = new Set(
      rows.map((c) =>
        String(c.tracker_tab ?? c.name)
          .trim()
          .toLowerCase(),
      ),
    );
    return {
      ok: true,
      data: {
        tabs,
        taken: tabs.filter((t) => claimed.has(t.trim().toLowerCase())),
        source,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Could not read the tracker workbook.",
    };
  }
}

/** Create the client, then assign its buyers. */
export async function createClientAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = NewClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
  }
  const c = parsed.data;

  const sb = await getRequestClient();

  /* THE TAB HAS TO EXIST, and the server is what decides it.
     The form greys out the button while the workbook is still being read, but
     that is a courtesy: a server action is a public endpoint, and the check the
     whole feature rests on cannot live only in the browser. A client pointed at
     a tab that is not there compiles with no data and reports absent every
     morning — silently, which is the failure this exists to prevent.

     An unreadable workbook does NOT block. Google being down should not be the
     reason nobody can onboard a client, and the unique index still guards the
     collision case. */
  try {
    const { tabs } = await listTrackerTabs();
    const needle = c.trackerTab.trim().toLowerCase();
    if (!tabs.some((x) => x.trim().toLowerCase() === needle)) {
      return {
        ok: false,
        error: `The tracker workbook has no tab called "${c.trackerTab}".`,
      };
    }
  } catch {
    // Left deliberately empty — see above.
  }

  /* Two clients on one tab means one of them silently shows the other's
     numbers. The unique index in migration 0013 is the real guard; this exists
     to say so in a sentence instead of a Postgres constraint name. */
  const { data: clash } = await sb
    .from("clients")
    .select("name")
    .ilike("tracker_tab", c.trackerTab)
    .maybeSingle();
  if (clash) {
    return {
      ok: false,
      error: `${clash.name} already reads the "${c.trackerTab}" tab.`,
    };
  }

  const id = randomUUID();
  const { error } = await sb.from("clients").insert({
    id,
    name: c.name,
    tracker_tab: c.trackerTab,
    domain: c.domain || null,
    descriptor: c.descriptor || null,
    currency: c.currency,
    source_of_truth: c.sourceOfTruth,
    cadence: c.cadence,
    channel: c.channel,
    account_timezone: c.accountTimezone,
    // Client-FACING daily notes stay off until someone deliberately turns them
    // on. A brand-new client should not start mailing its own stakeholders.
    daily_to_client: false,
  });
  if (error) return { ok: false, error: error.message };

  if (c.buyerIds.length > 0) {
    const { error: assignError } = await sb
      .from("client_assignments")
      .insert(c.buyerIds.map((buyer_id) => ({ client_id: id, buyer_id })));
    if (assignError) {
      /* The client exists but nobody can see it. Report exactly that — a clean
         success here would leave an invisible client the admin has no reason to
         go looking for. */
      return {
        ok: false,
        error:
          `${c.name} was created, but assigning buyers failed: ` +
          `${assignError.message}. Assign them from the team page.`,
      };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/today");
  revalidatePath("/clients");
  return { ok: true, data: { id } };
}
