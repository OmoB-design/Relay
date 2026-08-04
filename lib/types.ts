import { z } from "zod";

/* ============================================================================
   Relay domain model (CLAUDE.md "Core domain vocabulary").
   Types are DERIVED from zod schemas — the schema is the single source of truth,
   TS types are z.infer of it. Seed shapes and (later) AI output validate against
   these same schemas, so an invalid Claim cannot exist at runtime OR compile time.
   ========================================================================== */

// --- Primitives / enums -----------------------------------------------------

/** Evidence source: the ad platform vs. the agency's daily workbook. Meta is out
 *  of scope entirely — "Google Ads" is the only platform value. */
export const DataSourceSchema = z.enum(["Google Ads", "Tracker"]);
export type DataSource = z.infer<typeof DataSourceSchema>;

/** Per-client trusted tool, read from their tracker tab-header convention.
 *  Blended/new-customer numbers reach Relay via the Tracker but carry the
 *  client's source-of-truth tool so evidence always reconciles (AGENCY.md §3). */
export const SourceOfTruthSchema = z.enum(["Google Ads", "Triple Whale"]);
export type SourceOfTruth = z.infer<typeof SourceOfTruthSchema>;

/** Internal metric keys. KPIs map the client's own language onto these.
 *  The first eight are the agency's tracker columns (AGENCY.md §1). */
export const MetricKeySchema = z.enum([
  "spend",
  "sales",
  "revenue",
  "roas",
  "cpa_cpo", // cost per acquisition / cost per order
  "nc_roas", // new-customer ROAS
  "ncac", // new-customer acquisition cost
  "nvp", // tracker column 8 — expansion unconfirmed, polarity neutral until then
  "conversions", // orders
  "aov", // average order value
  "cpc", // cost per click
]);
export type MetricKey = z.infer<typeof MetricKeySchema>;

/** KPI polarity. Most KPIs are directional; a pacing KPI (e.g. spend pace, a
 *  target ± tolerance band) is "on_target" — inside the band is good either way. */
export const KpiPolaritySchema = z.enum([
  "higher_is_better",
  "lower_is_better",
  "on_target",
]);
export type KpiPolarity = z.infer<typeof KpiPolaritySchema>;

export const CurrencySchema = z.enum(["USD", "EUR", "GBP", "AED"]);
export type Currency = z.infer<typeof CurrencySchema>;

/** Brand vs non-brand economics differ enormously — a blended ROAS of 1.60 can
 *  hide 3.58 branded against 0.79 prospecting. Segment is first-class so a
 *  claim can cite the number that actually carries the story. The tracker only
 *  yields `overall`; Google Ads direct fills the rest. */
export const MetricSegmentSchema = z.enum([
  "overall",
  "branded",
  "non_branded",
]);
export type MetricSegment = z.infer<typeof MetricSegmentSchema>;

export const AccountHealthSchema = z.enum(["green", "amber", "red"]);
export type AccountHealth = z.infer<typeof AccountHealthSchema>;

export const ChannelSchema = z.enum(["whatsapp", "email"]);
export type Channel = z.infer<typeof ChannelSchema>;

/** A reporting window. `label` is a display convenience (e.g. "Jul 6–12"). */
export const PeriodSchema = z.object({
  start: z.string(), // ISO date
  end: z.string(), // ISO date
  label: z.string().optional(),
});
export type Period = z.infer<typeof PeriodSchema>;

// --- Client Graph -----------------------------------------------------------

export const AccountSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  platform: z.literal("Google Ads"), // Meta explicitly out of scope
  externalId: z.string(), // e.g. "731-556-2214"
  health: AccountHealthSchema,
  lastSyncAt: z.string(), // ISO datetime
});
export type Account = z.infer<typeof AccountSchema>;

/** A KPI in the client's own language, mapped to an internal metric. */
export const KpiSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  label: z.string(), // "cost per order", "NC ROAS", "blended ROAS"
  mapsTo: MetricKeySchema,
  target: z.number(),
  polarity: KpiPolaritySchema,
  format: z.enum(["currency", "count", "ratio", "percent"]),
  /** Optional +/- tolerance band as a percent (e.g. spend pace $52k ±10%). */
  tolerancePct: z.number().optional(),
  note: z.string().optional(),
});
export type Kpi = z.infer<typeof KpiSchema>;

/** A structured constraint on the client relationship — a typed object, never a
 *  free-text notes blob. The narrative layer consumes these as hard constraints. */
export const SensitivitySchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  type: z.enum(["framing", "cadence", "metric-avoidance", "tone"]),
  text: z.string(),
});
export type Sensitivity = z.infer<typeof SensitivitySchema>;

export const StakeholderSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string(),
  role: z.string(), // "founder", "finance"
  gets: z.enum(["short", "full", "deck"]), // which version they receive
});
export type Stakeholder = z.infer<typeof StakeholderSchema>;

export const CadenceSchema = z.object({
  primary: z.enum(["daily", "weekly", "weekly-lite", "monthly"]),
  secondary: z.enum(["daily", "weekly", "weekly-lite", "monthly"]).optional(),
  anchorDay: z
    .enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
    .optional(),
  note: z.string().optional(),
});
export type Cadence = z.infer<typeof CadenceSchema>;

/** The Client Graph: everything Relay knows about how to talk to a client. */
export const ClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  currency: CurrencySchema,
  sourceOfTruth: SourceOfTruthSchema,
  cadence: CadenceSchema,
  channel: ChannelSchema,
  descriptor: z.string().optional(), // "DTC functional beverage brand"
  /** May a client-FACING daily note go out? Internal digests compile for every
   *  client regardless; this governs what leaves the building. */
  dailyToClient: z.boolean().default(false),
  /** "Yesterday" is defined in the ad account's timezone, not the agency's. */
  accountTimezone: z.string().default("Asia/Dubai"),
});
export type Client = z.infer<typeof ClientSchema>;

/** The fully-hydrated Client Graph, as assembled for the workspace. */
export const ClientProfileSchema = ClientSchema.extend({
  accounts: z.array(AccountSchema),
  kpis: z.array(KpiSchema),
  sensitivities: z.array(SensitivitySchema),
  stakeholders: z.array(StakeholderSchema),
});
export type ClientProfile = z.infer<typeof ClientProfileSchema>;

// --- People -----------------------------------------------------------------

export const UserRoleSchema = z.enum(["admin", "buyer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

/** Revoked, never deleted: the audit trail names who confirmed a row and who
 *  dismissed a flag, so a departed buyer's profile has to outlive their access. */
export const UserStatusSchema = z.enum(["active", "revoked"]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  /** Empty until the invited buyer sets it. The page header greets this. */
  name: z.string(),
  role: UserRoleSchema,
  status: UserStatusSchema,
});
export type Profile = z.infer<typeof ProfileSchema>;

// --- Evidence ---------------------------------------------------------------

/** One metric snapshot — the atom of evidence that backs claims. */
export const EvidenceItemSchema = z.object({
  id: z.string(), // stable within a snapshot, e.g. "E1"
  snapshotId: z.string().uuid(),
  source: DataSourceSchema,
  /** For Tracker-sourced items, the client's source-of-truth tool to append to
   *  the source chip (e.g. "Tracker · Triple Whale"). */
  sourceOfTruth: SourceOfTruthSchema.optional(),
  metricKey: MetricKeySchema.optional(),
  metricLabel: z.string(), // display label, e.g. "Cost per order"
  value: z.number(),
  valueDisplay: z.string(), // pre-formatted, e.g. "$26.40", "31% of conversions"
  deltaPct: z.number().optional(), // signed, e.g. 21, -9
  deltaLabel: z.string(), // display, e.g. "−9% vs $29 target"
  /** Optional polarity override; otherwise resolved from config by metricKey. */
  polarity: z
    .enum(["higher_is_better", "lower_is_better", "neutral"])
    .optional(),
  segment: MetricSegmentSchema.default("overall"),
  /** Why a metric is absent, stated rather than silently omitted — e.g. "This
   *  account does not report new vs. returning customers." */
  unavailableReason: z.string().optional(),
  note: z.string().optional(),
  series: z.array(z.number()).optional(), // daily points for the inline sparkline
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

/** A pinned set of evidence for a period — the immutable data behind a narrative,
 *  answer, or flag. Timeline entries pin one of these forever. */
export const EvidenceSnapshotSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  period: PeriodSchema,
  asOf: z.string(), // ISO datetime
  items: z.array(EvidenceItemSchema),
});
export type EvidenceSnapshot = z.infer<typeof EvidenceSnapshotSchema>;

/** A pointer from a claim to a specific evidence item within a snapshot. */
export const EvidenceRefSchema = z.object({
  snapshotId: z.string().uuid(),
  itemId: z.string(),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

// --- Claims (the core invariant) --------------------------------------------

const ClaimBaseSchema = z.object({
  id: z.string().uuid(),
  narrativeId: z.string().uuid(),
  order: z.number().int(), // reading order within the narrative
  text: z.string(),
});

/** A factual sentence MUST carry at least one evidence ref. "No unsourced
 *  sentence ships" is enforced at the type level, not by review discipline. */
export const FactClaimSchema = ClaimBaseSchema.extend({
  kind: z.literal("fact"),
  evidenceRefs: z.array(EvidenceRefSchema).nonempty(),
});

/** A forward-looking sentence carries NO evidence (there is nothing yet to
 *  cite). A plan with refs is as invalid as a fact without them. */
export const PlanClaimSchema = ClaimBaseSchema.extend({
  kind: z.literal("plan"),
  evidenceRefs: z.array(EvidenceRefSchema).length(0),
});

export const ClaimSchema = z.discriminatedUnion("kind", [
  FactClaimSchema,
  PlanClaimSchema,
]);
export type Claim = z.infer<typeof ClaimSchema>;
export type FactClaim = z.infer<typeof FactClaimSchema>;
export type PlanClaim = z.infer<typeof PlanClaimSchema>;

// --- Narrative --------------------------------------------------------------

export const NarrativeStatusSchema = z.enum(["drafted", "reviewed", "sent"]);
export type NarrativeStatus = z.infer<typeof NarrativeStatusSchema>;

export const NarrativeSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  snapshotId: z.string().uuid(), // the evidence this draft draws on
  week: PeriodSchema,
  status: NarrativeStatusSchema,
  channel: ChannelSchema,
  emailGreeting: z.string().optional(), // e.g. "Hi Dana,"
  /** Authored condensed WhatsApp variant. Cleared when the draft is edited
   *  (falls back to deterministic condensation); Phase 8 regenerates it. */
  whatsappVariant: z.string().optional(),
  claims: z.array(ClaimSchema),
  reviewedAt: z.string().optional(),
  sentAt: z.string().optional(),
});
export type Narrative = z.infer<typeof NarrativeSchema>;

// --- Timeline ---------------------------------------------------------------

export const TimelineEntrySchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  type: z.enum(["commentary", "answer", "flag"]),
  date: z.string(), // ISO date
  summary: z.string(), // one-line
  body: z.string().optional(), // full artifact text
  snapshotId: z.string().uuid().optional(), // the pinned data snapshot
  refId: z.string().uuid().optional(), // narrative / answer / flag id
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

// --- Flags ------------------------------------------------------------------

/** A proactive anomaly or data-freshness card. Detection engine is post-MVP;
 *  the MVP renders seed flags and enforces the dismiss-with-reason audit trail. */
export const FlagSchema = z
  .object({
    id: z.string().uuid(),
    clientId: z.string().uuid(),
    kind: z.enum(["anomaly", "freshness"]),
    metricLabel: z.string(),
    deltaLabel: z.string(),
    headline: z.string(),
    diagnostic: z.string(),
    draftNote: z.string().optional(), // pre-drafted heads-up
    status: z.enum(["open", "resolved", "dismissed"]),
    dismissalReason: z.string().optional(),
    createdAt: z.string(),
  })
  .refine((f) => f.status !== "dismissed" || !!f.dismissalReason?.trim(), {
    message: "A dismissed flag must capture a non-empty reason.",
    path: ["dismissalReason"],
  });
export type Flag = z.infer<typeof FlagSchema>;

// --- Daily rows (Phase 7.5a — the daily ritual) --------------------------------

/** The eight tracker metrics for one client, one day, one segment.
 *  A value is `undefined` when Relay couldn't get it — never a stand-in zero;
 *  `unavailable` says why. `sales` stays fractional (Google Ads reports
 *  fractional conversions and rounding before deriving CPO drifts ~0.5%). */
/** The key under `unavailable` meaning "Relay read the source and this client
 *  had no row at all" — distinct from a single metric being absent. Lives here
 *  rather than with the compile because the data layer reads it too, and the
 *  compile already depends on the data layer. */
export const ROW_ABSENT_KEY = "_row";

export const DailyMetricsSchema = z.object({
  spend: z.number().optional(),
  sales: z.number().optional(),
  revenue: z.number().optional(),
  roas: z.number().optional(),
  cpa_cpo: z.number().optional(),
  nc_roas: z.number().optional(),
  ncac: z.number().optional(),
  nvp: z.number().optional(),
});
export type DailyMetrics = z.infer<typeof DailyMetricsSchema>;

export const DailyRowSchema = z
  .object({
    id: z.string().uuid(),
    clientId: z.string().uuid(),
    date: z.string(), // ISO date, in the account's timezone
    segment: MetricSegmentSchema.default("overall"),
    source: DataSourceSchema,
    sourceOfTruth: SourceOfTruthSchema.optional(),
    metrics: DailyMetricsSchema,
    /** metric key → why it's absent. Stated, not silently dropped. */
    unavailable: z.record(z.string(), z.string()).default({}),
    status: z.enum(["staged", "confirmed"]),
    edited: z.boolean().default(false),
    overrideReason: z.string().optional(),
    confirmedAt: z.string().optional(),
    compiledAt: z.string(),
  })
  .refine((r) => !r.edited || Boolean(r.overrideReason?.trim()), {
    message: "An edited daily row must capture a reason.",
    path: ["overrideReason"],
  });
export type DailyRow = z.infer<typeof DailyRowSchema>;

// --- Loom Brief (Phase 4) -----------------------------------------------------

/** One glance-formatted headline. Like a fact claim, it must cite evidence —
 *  its text is editable independently of the narrative's claims (video may
 *  want different emphasis than text). */
export const LoomHeadlineSchema = z.object({
  id: z.string().uuid(),
  briefId: z.string().uuid(),
  order: z.number().int(),
  text: z.string(),
  evidenceRefs: z.array(EvidenceRefSchema).nonempty(),
});
export type LoomHeadline = z.infer<typeof LoomHeadlineSchema>;

/** The one-page recording-prep artifact: 3 headlines, one risk, one win.
 *  Relay produces the brief only — never the video, upload, or send. */
export const LoomBriefSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  narrativeId: z.string().uuid(), // same week, same underlying claims/evidence
  snapshotId: z.string().uuid(),
  week: PeriodSchema,
  headlines: z.array(LoomHeadlineSchema),
  risk: z.string(), // one sentence
  win: z.string(), // one sentence
});
export type LoomBrief = z.infer<typeof LoomBriefSchema>;

// --- Voice profile (Phase 3: capture only; Phase 8: consumed by generation) --

/** One span of a word-level diff, shaped after `diff`'s diffWords output. */
export const EditDiffSegmentSchema = z.object({
  type: z.enum(["added", "removed", "unchanged"]),
  text: z.string(),
});
export type EditDiffSegment = z.infer<typeof EditDiffSegmentSchema>;

/** One captured edit: the before/after of a draft change made between
 *  `drafted` and `reviewed`, stored silently on the buyer's VoiceProfile. */
export const EditDiffSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  narrativeId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  beforeText: z.string(),
  afterText: z.string(),
  segments: z.array(EditDiffSegmentSchema),
  createdAt: z.string(),
});
export type EditDiff = z.infer<typeof EditDiffSchema>;

/** Per-buyer accumulated edit history. Pure data collection until Phase 8. */
export const VoiceProfileSchema = z.object({
  id: z.string().uuid(),
  buyerKey: z.string(), // single demo buyer in the pilot; real auth post-MVP
  createdAt: z.string().optional(),
});
export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;

// --- Answer Desk ------------------------------------------------------------

/** An answer to a client question, grounded strictly on snapshot evidence.
 *  `grounded: false` is the honest-miss card, not a hallucinated answer. */
export const AnswerSchema = z.object({
  text: z.string(),
  grounded: z.boolean(),
  evidenceRefs: z.array(EvidenceRefSchema),
  confidenceLabel: z.string(), // "Based on Google Ads data through Thu Jul 9"
});
export type Answer = z.infer<typeof AnswerSchema>;

export const AnswerThreadSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  question: z.string(),
  createdAt: z.string(),
  answer: AnswerSchema.optional(), // absent = still waiting on the buyer
});
export type AnswerThread = z.infer<typeof AnswerThreadSchema>;
