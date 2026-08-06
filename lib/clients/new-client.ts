import { z } from "zod";
import {
  CadenceSchema,
  ChannelSchema,
  CurrencySchema,
  SourceOfTruthSchema,
} from "@/lib/types";

/* The add-client contract, shared by the form and the server action.
   NOT in the actions file: a "use server" module may only export async
   functions, so a schema exported from there fails the build. */

/** The zones an agency actually bills in. A closed list rather than free text:
 *  "GMT+4" is what a person types and what Intl cannot resolve, and an
 *  unresolvable zone makes the daily compile fall back to the wrong day —
 *  which is exactly the bug that produced phantom "no tracker row" reports. */
export const TIMEZONES = [
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
] as const;

export const CADENCES = ["daily", "weekly", "weekly-lite", "monthly"] as const;

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const DAY_LABEL: Record<(typeof DAYS)[number], string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** What the form sends. Deliberately separate from ClientSchema — that one
 *  describes a client Relay already holds, this one describes what a human can
 *  type into a form and what has to be true before it becomes a client. */
export const NewClientSchema = z.object({
  name: z.string().trim().min(1, "Give the client a name."),
  /** The workbook tab. Defaults to the name in the form, but the two are
   *  allowed to differ: the tab is the agency's filing, the name is what Relay
   *  shows. Recording both is what stops a rename from silently unhooking a
   *  client from its numbers. */
  trackerTab: z.string().trim().min(1, "Pick the tracker tab to read."),
  domain: z
    .string()
    .trim()
    // People paste a URL. Keep the host and drop the rest rather than rejecting
    // it — "https://northbrook.com/shop" is not a mistake, it is a paste.
    .transform((v) =>
      v
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/.*$/, "")
        .toLowerCase(),
    )
    .refine((v) => v === "" || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v), {
      message: "That doesn't look like a domain.",
    })
    .optional(),
  descriptor: z.string().trim().optional(),
  sourceOfTruth: SourceOfTruthSchema,
  currency: CurrencySchema,
  /** IANA zone, from the closed list above. "Yesterday" is defined here, not in
   *  the agency's timezone: a Dubai account rolls over at 20:00 UTC and the
   *  daily compile has to agree with it. */
  accountTimezone: z.enum(TIMEZONES),
  cadence: CadenceSchema,
  channel: ChannelSchema,
  /** Assigned at creation on purpose: a buyer sees only what is assigned to
   *  them and the admin only oversees, so a client with nobody on it is
   *  invisible to the entire agency. */
  buyerIds: z.array(z.string().uuid()),
});
export type NewClient = z.infer<typeof NewClientSchema>;

/** What the workbook says, for the form to check a tab against. */
export type TrackerTabsResult = {
  /** Every tab in the workbook, in sheet order. */
  tabs: string[];
  /** Tabs already claimed by a client — offering one twice would give two
   *  clients the same numbers. */
  taken: string[];
  source: "live" | "fixture";
};

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };
