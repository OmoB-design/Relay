import {
  AnswerThreadSchema,
  ClientProfileSchema,
  EvidenceSnapshotSchema,
  FlagSchema,
  NarrativeSchema,
  TimelineEntrySchema,
  type AnswerThread,
  type ClientProfile,
  type EvidenceSnapshot,
  type Flag,
  type Narrative,
  type TimelineEntry,
} from "@/lib/types";
import {
  labelFor,
  shiftDay as sd,
  shiftStamp as st,
} from "@/lib/demo/calendar";

/* ============================================================================
   In-process seed — the SAME content as supabase/seed.sql, but validated
   through the zod schemas at module load. This serves two Phase-0 purposes:
     1. Proves every schema accepts the real seed content (import throws on drift).
     2. Drives /styleguide (and, until Supabase is provisioned, later phases)
        from real Northbrook data rather than lorem props.
   supabase/seed.sql is the complete DB source of truth; this mirrors the hero
   client fully and the others at profile depth. lib/data.ts is the single seam
   that flips to Supabase once env vars exist.
   ========================================================================== */

/** A period, with its label regenerated from the SHIFTED dates. `missing` names
 *  days the tracker never supplied, so the label still says so after a shift. */
function per(start: string, end: string, missing?: [string, string]) {
  const shifted = { start: sd(start), end: sd(end) };
  const label = labelFor(shifted.start, shifted.end);
  return {
    ...shifted,
    label: missing
      ? `${label} (${labelFor(sd(missing[0]), sd(missing[1]))} missing)`
      : label,
  };
}

const NORTHBROOK = "11111111-0000-4000-8000-000000000001";
const BIRKENSTOCK = "11111111-0000-4000-8000-000000000002";
const SWITCHUP = "11111111-0000-4000-8000-000000000003";
const SNAP_NB = "11111111-0000-4000-8000-0000000000a1";
const SNAP_BK = "11111111-0000-4000-8000-0000000000a2";
const SNAP_SU = "11111111-0000-4000-8000-0000000000a3";

export const clientProfiles: ClientProfile[] = ClientProfileSchema.array().parse([
  {
    id: NORTHBROOK,
    name: "Northbrook",
    currency: "USD",
    sourceOfTruth: "Google Ads",
    cadence: { primary: "weekly", anchorDay: "mon" },
    channel: "whatsapp",
    descriptor: "DTC functional beverage brand",
    accounts: [
      {
        id: "22222222-0000-4000-8000-000000000001",
        clientId: NORTHBROOK,
        platform: "Google Ads",
        externalId: "731-556-2214",
        health: "green",
        lastSyncAt: st("2026-07-12T23:59:00+04:00"),
      },
    ],
    kpis: [
      { id: "33333333-0000-4000-8000-000000000001", clientId: NORTHBROOK, label: "cost per order", mapsTo: "cpa_cpo", target: 29, polarity: "lower_is_better", format: "currency" },
      { id: "33333333-0000-4000-8000-000000000002", clientId: NORTHBROOK, label: "weekly orders", mapsTo: "conversions", target: 1900, polarity: "higher_is_better", format: "count" },
      { id: "33333333-0000-4000-8000-000000000003", clientId: NORTHBROOK, label: "NCAC", mapsTo: "ncac", target: 36, polarity: "lower_is_better", format: "currency" },
      { id: "33333333-0000-4000-8000-000000000004", clientId: NORTHBROOK, label: "spend pace", mapsTo: "spend", target: 52000, polarity: "on_target", format: "currency", tolerancePct: 10, note: "Weekly spend vs plan, ±10% band." },
    ],
    sensitivities: [
      { id: "44444444-0000-4000-8000-000000000001", clientId: NORTHBROOK, type: "framing", text: "Frame cost per order weekly, never daily — Dana reacts to daily swings." },
      { id: "44444444-0000-4000-8000-000000000002", clientId: NORTHBROOK, type: "metric-avoidance", text: "Never lead with ROAS; Dana doesn't trust blended ROAS." },
      { id: "44444444-0000-4000-8000-000000000003", clientId: NORTHBROOK, type: "tone", text: "WhatsApp preferred; short paragraphs." },
    ],
    stakeholders: [
      { id: "55555555-0000-4000-8000-000000000001", clientId: NORTHBROOK, name: "Dana K.", role: "founder", gets: "short" },
      { id: "55555555-0000-4000-8000-000000000002", clientId: NORTHBROOK, name: "Omar S.", role: "finance", gets: "full" },
    ],
  },
  {
    id: BIRKENSTOCK,
    name: "Birkenstock",
    currency: "USD",
    sourceOfTruth: "Triple Whale",
    cadence: { primary: "weekly-lite", secondary: "monthly", note: "Monthly deep-dive; weekly is bullets only." },
    channel: "email",
    descriptor: "DTC beauty brand",
    accounts: [
      {
        id: "22222222-0000-4000-8000-000000000002",
        clientId: BIRKENSTOCK,
        platform: "Google Ads",
        externalId: "604-118-9932",
        health: "amber",
        lastSyncAt: st("2026-07-09T23:59:00+04:00"),
      },
    ],
    kpis: [
      { id: "33333333-0000-4000-8000-000000000005", clientId: BIRKENSTOCK, label: "NC ROAS", mapsTo: "nc_roas", target: 2.2, polarity: "higher_is_better", format: "ratio" },
      { id: "33333333-0000-4000-8000-000000000006", clientId: BIRKENSTOCK, label: "NCAC", mapsTo: "ncac", target: 41, polarity: "lower_is_better", format: "currency" },
      { id: "33333333-0000-4000-8000-000000000007", clientId: BIRKENSTOCK, label: "revenue", mapsTo: "revenue", target: 88000, polarity: "higher_is_better", format: "currency", note: "Weekly revenue." },
    ],
    sensitivities: [
      { id: "44444444-0000-4000-8000-000000000004", clientId: BIRKENSTOCK, type: "cadence", text: "Monthly deep-dive; weekly is bullets only." },
      { id: "44444444-0000-4000-8000-000000000005", clientId: BIRKENSTOCK, type: "framing", text: "Always split new vs returning customers; the founder only trusts new-customer numbers." },
    ],
    stakeholders: [
      { id: "55555555-0000-4000-8000-000000000003", clientId: BIRKENSTOCK, name: "Lina M.", role: "founder", gets: "full" },
    ],
  },
  {
    id: SWITCHUP,
    name: "Switchup",
    currency: "USD",
    sourceOfTruth: "Google Ads",
    cadence: { primary: "weekly" },
    channel: "email",
    descriptor: "Premium apparel brand",
    accounts: [
      {
        id: "22222222-0000-4000-8000-000000000003",
        clientId: SWITCHUP,
        platform: "Google Ads",
        externalId: "220-871-5540",
        health: "green",
        lastSyncAt: st("2026-07-12T23:59:00+04:00"),
      },
    ],
    kpis: [
      { id: "33333333-0000-4000-8000-000000000008", clientId: SWITCHUP, label: "blended ROAS", mapsTo: "roas", target: 3.0, polarity: "higher_is_better", format: "ratio" },
      { id: "33333333-0000-4000-8000-000000000009", clientId: SWITCHUP, label: "AOV", mapsTo: "aov", target: 96, polarity: "higher_is_better", format: "currency" },
    ],
    sensitivities: [
      { id: "44444444-0000-4000-8000-000000000006", clientId: SWITCHUP, type: "tone", text: "Formal register; deck-ready phrasing." },
      { id: "44444444-0000-4000-8000-000000000007", clientId: SWITCHUP, type: "framing", text: "Quarterly narrative arc matters; always reference trajectory." },
    ],
    stakeholders: [
      { id: "55555555-0000-4000-8000-000000000004", clientId: SWITCHUP, name: "Rowan T.", role: "founder", gets: "deck" },
    ],
  },
]);

export const snapshots: EvidenceSnapshot[] = EvidenceSnapshotSchema.array().parse([
  {
    id: SNAP_NB,
    clientId: NORTHBROOK,
    period: per("2026-07-06", "2026-07-12"),
    asOf: st("2026-07-12T23:59:00+04:00"),
    items: [
      { id: "E1", snapshotId: SNAP_NB, source: "Google Ads", metricKey: "spend", metricLabel: "Performance Max spend", value: 39800, valueDisplay: "$39.8K", deltaPct: 21, deltaLabel: "+21%", polarity: "neutral", note: "prospecting scale-up", series: [5100, 5300, 5500, 5700, 5900, 6100, 6200] },
      { id: "E2", snapshotId: SNAP_NB, source: "Google Ads", metricKey: "spend", metricLabel: "Search spend (brand)", value: 14800, valueDisplay: "$14.8K", deltaPct: 9, deltaLabel: "+9%", polarity: "neutral", note: "steady", series: [2000, 2050, 2100, 2150, 2150, 2150, 2200] },
      { id: "E3", snapshotId: SNAP_NB, source: "Tracker", sourceOfTruth: "Google Ads", metricKey: "cpa_cpo", metricLabel: "Cost per order", value: 26.4, valueDisplay: "$26.40", deltaPct: -9, deltaLabel: "−9% vs $29 target", polarity: "lower_is_better", note: "held under target during scale", series: [27.1, 26.8, 26.6, 25.5, 26.0, 26.4, 26.6] },
      { id: "E4", snapshotId: SNAP_NB, source: "Google Ads", metricKey: "conversions", metricLabel: '"Objections" asset group', value: 31, valueDisplay: "31% of conversions", deltaLabel: "$23.10 CPO — cheapest in account", polarity: "higher_is_better", note: "launched wk of Jun 22" },
      { id: "E5", snapshotId: SNAP_NB, source: "Google Ads", metricKey: "cpc", metricLabel: "Avg CPC", value: 1.84, valueDisplay: "$1.84", deltaPct: 12, deltaLabel: "+12% midweek, settled Fri", polarity: "lower_is_better", note: "auction pressure, seasonal", series: [1.7, 1.78, 1.92, 1.98, 1.95, 1.82, 1.79] },
      { id: "E6", snapshotId: SNAP_NB, source: "Tracker", sourceOfTruth: "Google Ads", metricKey: "conversions", metricLabel: "Weekly orders", value: 2067, valueDisplay: "2,067", deltaPct: 14, deltaLabel: "+14% · target 1,900", polarity: "higher_is_better", note: "comfortably past target", series: [280, 290, 300, 295, 305, 300, 297] },
      { id: "E7", snapshotId: SNAP_NB, source: "Tracker", sourceOfTruth: "Google Ads", metricKey: "ncac", metricLabel: "NCAC", value: 34.2, valueDisplay: "$34.20", deltaPct: -4, deltaLabel: "−4% · target $36", polarity: "lower_is_better", note: "growth is new customers, not just repeats", series: [35.1, 34.8, 34.5, 33.9, 33.7, 34.2, 34.6] },
    ],
  },
  {
    id: SNAP_BK,
    clientId: BIRKENSTOCK,
    period: per("2026-07-06", "2026-07-09", ["2026-07-10", "2026-07-11"]),
    asOf: st("2026-07-09T23:59:00+04:00"),
    items: [
      { id: "G1", snapshotId: SNAP_BK, source: "Tracker", sourceOfTruth: "Triple Whale", metricKey: "nc_roas", metricLabel: "NC ROAS", value: 2.35, valueDisplay: "2.35x", deltaPct: 7, deltaLabel: "+7% · target 2.2", polarity: "higher_is_better", note: "ahead of target", series: [2.2, 2.3, 2.4, 2.35] },
      { id: "G2", snapshotId: SNAP_BK, source: "Tracker", sourceOfTruth: "Triple Whale", metricKey: "ncac", metricLabel: "NCAC", value: 43.5, valueDisplay: "$43.50", deltaPct: 6, deltaLabel: "+6% · target $41", polarity: "lower_is_better", note: "drifting above target", series: [41.0, 42.2, 43.1, 43.5] },
      { id: "G3", snapshotId: SNAP_BK, source: "Tracker", sourceOfTruth: "Triple Whale", metricKey: "revenue", metricLabel: "Weekly revenue", value: 84200, valueDisplay: "$84.2K", deltaPct: -4, deltaLabel: "−4% · target $88k", polarity: "higher_is_better", note: "slightly under target", series: [20500, 21000, 21200, 21500] },
      { id: "G4", snapshotId: SNAP_BK, source: "Tracker", sourceOfTruth: "Triple Whale", metricLabel: "New vs returning", value: 58, valueDisplay: "58% new / 42% returning", deltaLabel: "new-customer mix steady", polarity: "neutral", note: "founder trusts new-customer numbers" },
    ],
  },
  {
    id: SNAP_SU,
    clientId: SWITCHUP,
    period: per("2026-06-29", "2026-07-05"),
    asOf: st("2026-07-05T23:59:00+04:00"),
    items: [
      { id: "H1", snapshotId: SNAP_SU, source: "Google Ads", metricKey: "roas", metricLabel: "Blended ROAS", value: 3.15, valueDisplay: "3.15x", deltaPct: 5, deltaLabel: "+5% · target 3.0", polarity: "higher_is_better", note: "continuing upward trajectory", series: [2.9, 3.0, 3.05, 3.1, 3.15, 3.15, 3.15] },
      { id: "H2", snapshotId: SNAP_SU, source: "Google Ads", metricKey: "aov", metricLabel: "AOV", value: 98.4, valueDisplay: "$98.40", deltaPct: 2, deltaLabel: "+2% · target $96", polarity: "higher_is_better", note: "modestly above target", series: [95, 96, 97, 98, 98, 99, 98] },
      { id: "H3", snapshotId: SNAP_SU, source: "Google Ads", metricKey: "spend", metricLabel: "Media investment", value: 31500, valueDisplay: "$31.5K", deltaPct: 3, deltaLabel: "+3%", polarity: "neutral", note: "in line with seasonal plan", series: [4300, 4400, 4500, 4500, 4600, 4600, 4600] },
    ],
  },
]);

export const narratives: Narrative[] = NarrativeSchema.array().parse([
  {
    id: "11111111-0000-4000-8000-0000000000b1",
    clientId: NORTHBROOK,
    snapshotId: SNAP_NB,
    week: per("2026-07-06", "2026-07-12"),
    status: "drafted",
    channel: "whatsapp",
    emailGreeting: "Hi Dana,",
    claims: [
      { id: "66666666-0000-4000-8000-000000000001", narrativeId: "11111111-0000-4000-8000-0000000000b1", order: 1, kind: "fact", text: "We deliberately scaled last week — total spend came to $54.6k, up 18% on the week before, with most of the increase going into Performance Max prospecting.", evidenceRefs: [{ snapshotId: SNAP_NB, itemId: "E1" }, { snapshotId: SNAP_NB, itemId: "E2" }] },
      { id: "66666666-0000-4000-8000-000000000002", narrativeId: "11111111-0000-4000-8000-0000000000b1", order: 2, kind: "fact", text: "Cost per order held at $26.40 — about 9% under our $29 line — even with the extra budget, which is the signal we wanted before pushing further.", evidenceRefs: [{ snapshotId: SNAP_NB, itemId: "E3" }] },
      { id: "66666666-0000-4000-8000-000000000003", narrativeId: "11111111-0000-4000-8000-0000000000b1", order: 3, kind: "fact", text: "The objection-handling asset group is now the account's engine: 31% of all conversions at the cheapest cost per order of any group.", evidenceRefs: [{ snapshotId: SNAP_NB, itemId: "E4" }] },
      { id: "66666666-0000-4000-8000-000000000004", narrativeId: "11111111-0000-4000-8000-0000000000b1", order: 4, kind: "fact", text: "CPCs climbed about 12% midweek from auction pressure, then settled by Friday — worth knowing about, not worth reacting to.", evidenceRefs: [{ snapshotId: SNAP_NB, itemId: "E5" }] },
      { id: "66666666-0000-4000-8000-000000000005", narrativeId: "11111111-0000-4000-8000-0000000000b1", order: 5, kind: "fact", text: "That put us at 2,067 orders for the week, comfortably past the 1,900 target.", evidenceRefs: [{ snapshotId: SNAP_NB, itemId: "E6" }] },
      { id: "66666666-0000-4000-8000-000000000006", narrativeId: "11111111-0000-4000-8000-0000000000b1", order: 6, kind: "fact", text: "New-customer acquisition cost came in at $34.20, 4% better than last week — the growth is coming from new buyers, not just repeat orders.", evidenceRefs: [{ snapshotId: SNAP_NB, itemId: "E7" }] },
      { id: "66666666-0000-4000-8000-000000000007", narrativeId: "11111111-0000-4000-8000-0000000000b1", order: 7, kind: "plan", text: "→ This week: shift roughly 15% of budget toward the objection asset group and hold everything else steady while CPCs normalise.", evidenceRefs: [] },
    ],
  },
  {
    id: "11111111-0000-4000-8000-0000000000b2",
    clientId: BIRKENSTOCK,
    snapshotId: SNAP_BK,
    week: per("2026-07-06", "2026-07-09"),
    status: "reviewed",
    channel: "email",
    emailGreeting: "Hi Lina,",
    reviewedAt: st("2026-07-10T09:00:00+04:00"),
    claims: [
      { id: "66666666-0000-4000-8000-000000000011", narrativeId: "11111111-0000-4000-8000-0000000000b2", order: 1, kind: "fact", text: "New-customer ROAS came in at 2.35 for the week, ahead of the 2.2 target.", evidenceRefs: [{ snapshotId: SNAP_BK, itemId: "G1" }] },
      { id: "66666666-0000-4000-8000-000000000012", narrativeId: "11111111-0000-4000-8000-0000000000b2", order: 2, kind: "fact", text: "New customers made up 58% of orders, with the mix holding steady week on week.", evidenceRefs: [{ snapshotId: SNAP_BK, itemId: "G4" }] },
      { id: "66666666-0000-4000-8000-000000000013", narrativeId: "11111111-0000-4000-8000-0000000000b2", order: 3, kind: "fact", text: "New-customer acquisition cost was $43.50, about 6% above the $41 target — worth watching.", evidenceRefs: [{ snapshotId: SNAP_BK, itemId: "G2" }] },
      { id: "66666666-0000-4000-8000-000000000014", narrativeId: "11111111-0000-4000-8000-0000000000b2", order: 4, kind: "fact", text: "Weekly revenue landed at $84.2k, roughly 4% under the $88k target.", evidenceRefs: [{ snapshotId: SNAP_BK, itemId: "G3" }] },
      { id: "66666666-0000-4000-8000-000000000015", narrativeId: "11111111-0000-4000-8000-0000000000b2", order: 5, kind: "plan", text: "→ This week: tighten the prospecting audience signals to bring NCAC back toward target.", evidenceRefs: [] },
    ],
  },
  {
    id: "11111111-0000-4000-8000-0000000000b3",
    clientId: SWITCHUP,
    snapshotId: SNAP_SU,
    week: per("2026-06-29", "2026-07-05"),
    status: "sent",
    channel: "email",
    emailGreeting: "Hi Rowan,",
    reviewedAt: st("2026-07-06T08:30:00+04:00"),
    sentAt: st("2026-07-06T09:00:00+04:00"),
    claims: [
      { id: "66666666-0000-4000-8000-000000000021", narrativeId: "11111111-0000-4000-8000-0000000000b3", order: 1, kind: "fact", text: "Blended ROAS closed the week at 3.15, ahead of the 3.0 benchmark and continuing the upward trajectory from the prior fortnight.", evidenceRefs: [{ snapshotId: SNAP_SU, itemId: "H1" }] },
      { id: "66666666-0000-4000-8000-000000000022", narrativeId: "11111111-0000-4000-8000-0000000000b3", order: 2, kind: "fact", text: "Average order value held firm at $98.40, modestly above the $96 target.", evidenceRefs: [{ snapshotId: SNAP_SU, itemId: "H2" }] },
      { id: "66666666-0000-4000-8000-000000000023", narrativeId: "11111111-0000-4000-8000-0000000000b3", order: 3, kind: "fact", text: "Media investment was $31.5k, up 3% week on week in line with the seasonal plan.", evidenceRefs: [{ snapshotId: SNAP_SU, itemId: "H3" }] },
      { id: "66666666-0000-4000-8000-000000000024", narrativeId: "11111111-0000-4000-8000-0000000000b3", order: 4, kind: "plan", text: "→ Looking ahead: maintain the current allocation while we build toward the quarter-end narrative.", evidenceRefs: [] },
    ],
  },
]);

export const flags: Flag[] = FlagSchema.array().parse([
  {
    id: "11111111-0000-4000-8000-0000000000c1",
    clientId: BIRKENSTOCK,
    kind: "anomaly",
    metricLabel: "NCAC",
    deltaLabel: "+16% over 3 days",
    headline: "NCAC up 16% over 3 days ($47.60 vs $41 target).",
    diagnostic: "Likely cause: new prospecting asset group widened reach faster than conversion volume. Similar incident May 18 recovered in 5 days after audience-signal tightening.",
    draftNote: "Heads-up on Birkenstock: new-customer acquisition cost has drifted to $47.60 over the last three days, about 16% above the $41 target. We think the new prospecting asset group widened reach faster than conversions caught up — same shape as the May 18 dip, which recovered in five days once we tightened the audience signals. Doing that now; will keep you posted.",
    status: "open",
    createdAt: st("2026-07-12T20:00:00+04:00"),
  },
  {
    id: "11111111-0000-4000-8000-0000000000c2",
    clientId: SWITCHUP,
    kind: "anomaly",
    metricLabel: "Cost per order",
    deltaLabel: "AOV-test noise",
    headline: "Cost-per-order noise during the approved AOV test.",
    diagnostic: "CPO variance flagged during the approved AOV test window; expected while basket size shifts.",
    status: "dismissed",
    dismissalReason: "Known — client approved AOV test, expect CPO noise through Jul 20.",
    createdAt: st("2026-07-08T11:00:00+04:00"),
  },
  {
    id: "11111111-0000-4000-8000-0000000000c3",
    clientId: BIRKENSTOCK,
    kind: "freshness",
    metricLabel: "Tracker freshness",
    deltaLabel: "Jul 10–11 missing",
    headline: "Tracker rows missing for Jul 10–11.",
    diagnostic: "Per agency rules, Relay never interpolates missing days — narratives will exclude those dates and say so.",
    status: "open",
    createdAt: st("2026-07-12T08:00:00+04:00"),
  },
]);

export const answerThreads: AnswerThread[] = AnswerThreadSchema.array().parse([
  {
    id: "11111111-0000-4000-8000-0000000000d3",
    clientId: SWITCHUP,
    question: "Can you confirm July is still tracking to the Q3 plan we set?",
    createdAt: st("2026-07-13T06:15:00+04:00"),
  },
]);

export const timeline: TimelineEntry[] = TimelineEntrySchema.array().parse([
  { id: "77777777-0000-4000-8000-000000000003", clientId: NORTHBROOK, type: "commentary", date: sd("2026-06-29"), summary: "CPCs starting to climb midweek — watching auction pressure." },
  { id: "77777777-0000-4000-8000-000000000004", clientId: NORTHBROOK, type: "commentary", date: sd("2026-07-06"), summary: "Deliberate scale-up: spend $54.6k, cost per order held at $26.40, orders 2,067.", snapshotId: SNAP_NB, refId: "11111111-0000-4000-8000-0000000000b1" },
]);
