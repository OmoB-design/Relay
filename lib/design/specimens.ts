import { format, parseISO, subDays } from "date-fns";
import {
  labelFor,
  shiftDay as sd,
  shiftStamp as st,
  yesterday,
} from "@/lib/demo/calendar";
import { now } from "@/lib/clock";
import {
  ROW_ABSENT_KEY,
  DailyRowSchema,
  FlagSchema,
  NarrativeSchema,
  type ClientProfile,
  type DailyRow,
  type Flag,
  type Narrative,
} from "@/lib/types";

/* ============================================================================
   Specimen fixtures for the design catalogue (/design/states/*).

   WHY A SEPARATE FILE. The state catalogue must show states that real data
   does not currently produce — a stale row, an absent tracker row, a resolved
   flag, an empty week. Waiting for production to reach a state is not a
   handoff strategy.

   Every id here is prefixed `dddddddd-` (d for design), which cannot collide
   with any seeded or ingested row. Actions triggered from the catalogue point
   at ids that do not exist, so they fail loudly and change nothing.

   Everything is parsed through the same zod schemas as production data, so a
   specimen can never describe a state the domain model forbids. If a schema
   tightens, these throw at import — the catalogue cannot drift silently.
   ========================================================================== */

/* Ids are hex-encoded from a number: the zod uuid check enforces the full RFC
   shape, so a mnemonic like "r1" is not a legal node segment. Ranges below keep
   the fixtures readable in a database dump if one ever leaks into a query. */
const id = (n: number) => `dddddddd-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

const today = () => format(now(), "yyyy-MM-dd");
const per = (start: string, end: string) => {
  const shifted = { start: sd(start), end: sd(end) };
  return { ...shifted, label: labelFor(shifted.start, shifted.end) };
};

const CLIENT = { northbrook: 0xc1, birkenstock: 0xc2, switchup: 0xc3, huggers: 0xc4 };
const ROW = { staged: 0x11, confirmed: 0x12, edited: 0x13, partial: 0x14, absent: 0x15 };
const FLAG = { withDraft: 0x21, noDraft: 0x22, breach: 0x23, dismissed: 0x24, resolved: 0x25 };
const NARRATIVE = { drafted: 0x31, reviewed: 0x32, sent: 0x33 };
const SNAPSHOT = 0x41;

/** Three days behind yesterday — enough to read as "something stopped". */
const STALE_DATE = format(subDays(parseISO(yesterday()), 3), "yyyy-MM-dd");
const COMPILED_AT = `${today()}T02:00:00+04:00`;
const YESTERDAY = yesterday();

// --- Clients (only the fields the digest band reads) -------------------------

type DigestClient = Pick<
  ClientProfile,
  "id" | "name" | "sourceOfTruth" | "dailyToClient"
>;

export const specClients: Record<
  "northbrook" | "birkenstock" | "switchup" | "huggers",
  DigestClient
> = {
  northbrook: {
    id: id(CLIENT.northbrook),
    name: "Northbrook",
    sourceOfTruth: "Google Ads",
    dailyToClient: true,
  },
  birkenstock: {
    id: id(CLIENT.birkenstock),
    name: "Birkenstock",
    sourceOfTruth: "Triple Whale",
    dailyToClient: false,
  },
  switchup: {
    id: id(CLIENT.switchup),
    name: "Switchup",
    sourceOfTruth: "Google Ads",
    dailyToClient: true,
  },
  huggers: {
    id: id(CLIENT.huggers),
    name: "Huggers",
    sourceOfTruth: "Google Ads",
    dailyToClient: true,
  },
};

// --- Daily rows -------------------------------------------------------------

const FULL_METRICS = {
  spend: 2318.44,
  sales: 88.4,
  revenue: 16244.2,
  roas: 7.01,
  cpa_cpo: 26.23,
  nc_roas: 2.41,
  ncac: 34.8,
  nvp: 77.26,
};

export const specRows = {
  /** Waiting for a human. The default morning state. */
  staged: DailyRowSchema.parse({
    id: id(ROW.staged),
    clientId: specClients.northbrook.id,
    date: YESTERDAY,
    source: "Tracker",
    sourceOfTruth: "Google Ads",
    metrics: FULL_METRICS,
    status: "staged",
    compiledAt: COMPILED_AT,
  }),

  /** Reviewed and accepted as-is. */
  confirmed: DailyRowSchema.parse({
    id: id(ROW.confirmed),
    clientId: specClients.switchup.id,
    date: YESTERDAY,
    source: "Tracker",
    sourceOfTruth: "Google Ads",
    metrics: { ...FULL_METRICS, spend: 1904.1, cpa_cpo: 28.9 },
    status: "confirmed",
    confirmedAt: `${today()}T08:12:00+04:00`,
    compiledAt: COMPILED_AT,
  }),

  /** Confirmed with corrections — the reason is part of the record. */
  edited: DailyRowSchema.parse({
    id: id(ROW.edited),
    clientId: specClients.huggers.id,
    date: YESTERDAY,
    source: "Tracker",
    sourceOfTruth: "Google Ads",
    metrics: { ...FULL_METRICS, ncac: 41.2 },
    status: "confirmed",
    edited: true,
    overrideReason:
      "Tracker NCAC was pasted from the CPA column — corrected against Triple Whale.",
    confirmedAt: `${today()}T08:20:00+04:00`,
    compiledAt: COMPILED_AT,
  }),

  /** Some metrics genuinely unavailable. Never rendered as zero. */
  partial: DailyRowSchema.parse({
    id: id(ROW.partial),
    clientId: specClients.birkenstock.id,
    date: YESTERDAY,
    source: "Tracker",
    sourceOfTruth: "Triple Whale",
    metrics: {
      spend: 1180.6,
      sales: 24.2,
      revenue: 5412.8,
      roas: 4.58,
      cpa_cpo: 48.78,
    },
    unavailable: {
      nc_roas: "Triple Whale returned no new-customer data for this date.",
      ncac: "Triple Whale returned no new-customer data for this date.",
      nvp: "Triple Whale returned no new-customer data for this date.",
    },
    status: "staged",
    compiledAt: COMPILED_AT,
  }),

  /** Relay read the tracker and the row was not there. */
  absentRow: DailyRowSchema.parse({
    id: id(ROW.absent),
    clientId: specClients.birkenstock.id,
    date: YESTERDAY,
    source: "Tracker",
    metrics: {},
    unavailable: {
      [ROW_ABSENT_KEY]: `No tracker row for ${YESTERDAY}. Relay never interpolates a missing day.`,
    },
    status: "staged",
    compiledAt: COMPILED_AT,
  }),
} satisfies Record<string, DailyRow>;

// --- Digest band entries ----------------------------------------------------

export type SpecEntry = {
  client: DigestClient;
  row?: DailyRow;
  problem?: { kind: "notCompiled" | "absent" | "stale"; message: string };
};

export const specEntries = {
  /** Four clients, mixed statuses — what a real Monday looks like. */
  mixed: [
    { client: specClients.northbrook, row: specRows.staged },
    { client: specClients.birkenstock, row: specRows.partial },
    { client: specClients.switchup, row: specRows.confirmed },
    { client: specClients.huggers, row: specRows.edited },
  ],
  staged: [{ client: specClients.northbrook, row: specRows.staged }],
  confirmed: [{ client: specClients.switchup, row: specRows.confirmed }],
  edited: [{ client: specClients.huggers, row: specRows.edited }],
  partial: [{ client: specClients.birkenstock, row: specRows.partial }],
  allConfirmed: [
    { client: specClients.switchup, row: specRows.confirmed },
    { client: specClients.huggers, row: specRows.edited },
  ],

  /** Relay hasn't looked yet → re-run the compile. */
  notCompiled: [
    {
      client: specClients.northbrook,
      problem: {
        kind: "notCompiled" as const,
        message: `Not compiled for ${YESTERDAY} yet.`,
      },
    },
  ],

  /** Relay looked; the row isn't in the tracker → go fill the sheet. */
  absent: [
    {
      client: specClients.birkenstock,
      problem: {
        kind: "absent" as const,
        message: specRows.absentRow.unavailable[ROW_ABSENT_KEY]!,
      },
    },
  ],

  /** The newest row is for an older day → investigate before trusting it. */
  stale: [
    {
      client: specClients.huggers,
      problem: {
        kind: "stale" as const,
        message: `Newest row is ${STALE_DATE}, not ${YESTERDAY}. Relay reports this as absent, never as zero.`,
      },
    },
  ],

  /** All three absences side by side — the comparison that matters most. */
  allProblems: [
    {
      client: specClients.northbrook,
      problem: {
        kind: "notCompiled" as const,
        message: `Not compiled for ${YESTERDAY} yet.`,
      },
    },
    {
      client: specClients.birkenstock,
      problem: {
        kind: "absent" as const,
        message: specRows.absentRow.unavailable[ROW_ABSENT_KEY]!,
      },
    },
    {
      client: specClients.huggers,
      problem: {
        kind: "stale" as const,
        message: `Newest row is ${STALE_DATE}, not ${YESTERDAY}. Relay reports this as absent, never as zero.`,
      },
    },
  ],

  empty: [] as SpecEntry[],
} satisfies Record<string, SpecEntry[]>;

// --- Flags ------------------------------------------------------------------

export const specFlags = {
  /** Open, with a pre-drafted heads-up → both Dismiss and Edit & send. */
  withDraft: FlagSchema.parse({
    id: id(FLAG.withDraft),
    clientId: specClients.birkenstock.id,
    kind: "anomaly",
    metricLabel: "NCAC",
    deltaLabel: "+16% over 3 days",
    headline: "NCAC up 16% over 3 days ($47.60 vs $41 target).",
    diagnostic:
      "Likely cause: new prospecting asset group widened reach faster than conversion volume. Similar incident May 18 recovered in 5 days after audience-signal tightening.",
    draftNote:
      "Heads-up on Birkenstock: new-customer acquisition cost has drifted to $47.60 over the last three days, about 16% above the $41 target. Same shape as the May 18 dip, which recovered in five days once we tightened the audience signals. Doing that now; will keep you posted.",
    status: "open",
    createdAt: st("2026-07-12T20:00:00+04:00"),
  }),

  /** Open with NO draft → Dismiss only. The button never leads nowhere. */
  noDraft: FlagSchema.parse({
    id: id(FLAG.noDraft),
    clientId: specClients.northbrook.id,
    kind: "freshness",
    metricLabel: "Tracker freshness",
    deltaLabel: "Jul 10–11 missing",
    headline: "Tracker rows missing for Jul 10–11.",
    diagnostic:
      "Per agency rules, Relay never interpolates missing days — narratives will exclude those dates and say so.",
    status: "open",
    createdAt: st("2026-07-12T08:00:00+04:00"),
  }),

  /** Target breach — the third detector shape. */
  breach: FlagSchema.parse({
    id: id(FLAG.breach),
    clientId: specClients.huggers.id,
    kind: "anomaly",
    metricLabel: "CPA/CPO",
    deltaLabel: "18% off target",
    headline: "CPA/CPO is 18% off target ($34.20 vs $29.00).",
    diagnostic:
      "Yesterday's cost per order breached the target band. Check whether the prospecting push is still settling before reacting.",
    draftNote:
      "Quick note on Huggers: cost per order came in at $34.20 yesterday against our $29 line. We're watching whether the prospecting push settles before making changes.",
    status: "open",
    createdAt: st("2026-07-13T02:05:00+04:00"),
  }),

  /** Human-dismissed with a captured reason. Never overridden by the engine. */
  dismissed: FlagSchema.parse({
    id: id(FLAG.dismissed),
    clientId: specClients.switchup.id,
    kind: "anomaly",
    metricLabel: "Cost per order",
    deltaLabel: "AOV-test noise",
    headline: "Cost-per-order noise during the approved AOV test.",
    diagnostic:
      "CPO variance flagged during the approved AOV test window; expected while basket size shifts.",
    status: "dismissed",
    dismissalReason:
      "Known — client approved AOV test, expect CPO noise through Jul 20.",
    createdAt: st("2026-07-08T11:00:00+04:00"),
  }),

  /** Engine-retracted: the condition stopped holding. Can re-open later. */
  resolved: FlagSchema.parse({
    id: id(FLAG.resolved),
    clientId: specClients.northbrook.id,
    kind: "anomaly",
    metricLabel: "ROAS",
    deltaLabel: "recovered",
    headline: "ROAS was 12% below target for 3 days.",
    diagnostic:
      "The condition no longer holds as of the latest compile — Relay retracted this automatically.",
    status: "resolved",
    createdAt: st("2026-07-10T02:00:00+04:00"),
  }),
} satisfies Record<string, Flag>;

export const specFlagItems = {
  all: [
    { flag: specFlags.withDraft, clientName: "Birkenstock" },
    { flag: specFlags.breach, clientName: "Huggers" },
    { flag: specFlags.noDraft, clientName: "Northbrook" },
  ],
  one: [{ flag: specFlags.withDraft, clientName: "Birkenstock" }],
};

// --- Narratives (Due this week) ---------------------------------------------

const claim = (narrative: number, order: number, text: string) => ({
  id: id(narrative * 0x100 + order),
  narrativeId: id(narrative),
  order,
  kind: "fact" as const,
  text,
  evidenceRefs: [{ snapshotId: id(SNAPSHOT), itemId: "E1" }],
});

export const specNarratives = {
  drafted: NarrativeSchema.parse({
    id: id(NARRATIVE.drafted),
    clientId: specClients.northbrook.id,
    snapshotId: id(SNAPSHOT),
    week: per("2026-07-06", "2026-07-12"),
    status: "drafted",
    channel: "whatsapp",
    claims: [claim(NARRATIVE.drafted, 1, "Spend came to $54.6k, up 18% on the week before.")],
  }),
  reviewed: NarrativeSchema.parse({
    id: id(NARRATIVE.reviewed),
    clientId: specClients.birkenstock.id,
    snapshotId: id(SNAPSHOT),
    week: per("2026-07-06", "2026-07-09"),
    status: "reviewed",
    channel: "email",
    reviewedAt: st("2026-07-13T07:40:00+04:00"),
    claims: [claim(NARRATIVE.reviewed, 1, "New-customer ROAS came in at 2.35 for the week.")],
  }),
  sent: NarrativeSchema.parse({
    id: id(NARRATIVE.sent),
    clientId: specClients.switchup.id,
    snapshotId: id(SNAPSHOT),
    week: per("2026-06-29", "2026-07-05"),
    status: "sent",
    channel: "email",
    reviewedAt: st("2026-07-06T08:30:00+04:00"),
    sentAt: st("2026-07-06T09:00:00+04:00"),
    claims: [claim(NARRATIVE.sent, 1, "Blended ROAS closed the week at 3.15.")],
  }),
} satisfies Record<string, Narrative>;

// --- Answer Desk waiting threads -------------------------------------------

export const specWaiting = [
  {
    clientName: "Switchup",
    question: "Can you confirm July is still tracking to the Q3 plan we set?",
    age: "2 hours",
  },
  {
    clientName: "Northbrook",
    question: "Why did cost per order move on Thursday?",
    age: "19 hours",
  },
];
