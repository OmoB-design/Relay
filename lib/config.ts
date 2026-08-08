import { z } from "zod";
import { format, formatDistanceStrict, parseISO } from "date-fns";
import { now } from "@/lib/clock";
import { MetricKeySchema } from "@/lib/types";
import type { Currency, MetricKey } from "@/lib/types";

/* ============================================================================
   lib/config.ts — the ONE place tunables live (CLAUDE.md convention #2).
   Thresholds, durations, page sizes, polarity, locale, and repeated copy.
   If a value appears twice anywhere, it belongs here. Zod-validated at import.
   ========================================================================== */

const MetricPolaritySchema = z.enum([
  "higher_is_better",
  "lower_is_better",
  "neutral",
]);

const ConfigSchema = z.object({
  /** motion durations in ms (design.md §2 "Motion"). */
  motion: z.object({
    fast: z.number().int().positive(),
    base: z.number().int().positive(),
  }),

  /** Delta coloring is by MEANING for the client, not by sign (design.md §2).
   *  A CPA/CPO drop is positive; a ROAS drop is negative; a spend move is
   *  neutral until context makes it otherwise. */
  deltaPolarity: z.record(z.string(), MetricPolaritySchema),

  /** Pagination / windowing. */
  pageSizes: z.object({
    library: z.number().int().positive(),
    timeline: z.number().int().positive(),
    /** How long a SENT narrative stays visible on Today before it's history. */
    dueRecentDays: z.number().int().positive(),
  }),

  /** Currency + locale. USD default; per-client override supported (SEED uses
   *  USD throughout; EUR override is exercised only in config tests). */
  currency: z.object({
    default: z.string().length(3),
    locale: z.record(z.string(), z.string()), // currency code -> BCP-47 locale
  }),

  /** Working timezone: GST (UTC+4) (SEED.md). */
  timezone: z.string(),

  /** NarrativeSplitView tunables (design.md §4.3 + the flagship mockup). */
  splitView: z.object({
    paneSplitPct: z.number().min(50).max(70), // left (draft) pane width, desktop
    dimOpacity: z.number().min(0).max(1), // unselected evidence/claims
    settleTranslatePx: z.number(), // linked-card "settle" lift
    mobileBreakpointPx: z.number().int(), // below this, evidence becomes a Sheet
  }),

  /** Voice-profile capture (Phase 3 silent collection). */
  voice: z.object({
    demoBuyerKey: z.string(),
  }),

  /** The daily ritual (Phase 7.5a). Times are in the agency's working zone;
   *  "yesterday" is resolved per client in the ad account's timezone. */
  daily: z.object({
    pullHour: z.number().int().min(0).max(23), // day has ended, attribution settling
    deliverHour: z.number().int().min(0).max(23), // buyer's start time
    readyLeadHours: z.number().int().positive(), // digest waiting this early
    retryAttempts: z.number().int().positive(),
    retryGapMinutes: z.number().int().positive(),
    numbersWindowDays: z.number().int().positive(), // the agency's own convention
    /** Manual re-compile cooldown. Each run hits the Sheets API once per
     *  client; rapid clicking would burn quota for no new information. */
    recompileCooldownSeconds: z.number().int().positive(),
  }),

  /** Flag detection thresholds (Phase 7.5a). Per-client overridable later. */
  flags: z.object({
    targetBreachPct: z.number().positive(), // wrong side of a KPI target by >this
    daySwingPct: z.number().positive(), // vs the trailing average
    swingBaselineDays: z.number().int().positive(),
    sustainedDriftDays: z.number().int().positive(), // consecutive wrong-way days
    /** A drift only counts if the current value is also materially worse than
     *  its trailing MEDIAN — otherwise every settle-down after a spike day
     *  reads as a decline. */
    sustainedDriftMinPct: z.number().positive(),
    /** Period-scoped targets ("weekly orders: 1,900") divided down before a
     *  single day is judged against them. Assumes weekly, which is every
     *  seeded target; an explicit KPI `targetPeriod` is the proper fix. */
    dailyTargetDivisor: z.number().int().positive(),
    /** How far a client's newest DATA row may fall behind yesterday before its
     *  source counts as stopped, at which point its engine anomaly flags are
     *  suppressed from the queue — not resolved. They may well still be true;
     *  nobody can tell, and "resolved" would claim otherwise. */
    staleSourceDays: z.number().int().nonnegative(),
  }),

  /** Tracker ingestion (Phase 7, AGENCY.md §1/§3). Read-only Google Sheets. */
  ingestion: z.object({
    /** Tab-header convention: the client's source of truth is named in the
     *  header block above the DAILY ENTRY table. */
    sourceOfTruthPrefix: z.string(),
    /** Header cell that marks the start of the daily table. */
    dateHeader: z.string(),
    /** Sheet column header → internal metric key. Order-independent: the
     *  mapper matches on the header text, so a re-ordered tab still works. */
    columnToMetric: z.record(z.string(), MetricKeySchema),
    /** How a week's value is derived from daily rows, per metric.
     *  sum     — additive (spend, sales, revenue)
     *  derived — recomputed from summed components (correct for ratios)
     *  last    — the period's closing value (ratios whose components the
     *            tracker doesn't carry: NC ROAS, NCAC, NVP)
     *  Matches the agency's own apparent convention; confirm at onboarding. */
    aggregation: z.record(z.string(), z.enum(["sum", "derived", "last"])),
    /** Tabs that are not clients (AGENCY.md §1). */
    ignoredTabs: z.array(z.string()),
    /** Dry-run: report a value mismatch beyond this, ignore rounding noise. */
    dryRunTolerancePct: z.number().positive(),
    /** Local fixture used when no live workbook is configured. */
    fixturePath: z.string(),
  }),

  /** Client marks. PROVISIONAL: the mockups use Shopify's logo, but a client's
   *  `sourceOfTruth` is only ever Google Ads or Triple Whale, so the glyph is
   *  standing in for either a brand avatar or a source mark — undecided. Keyed
   *  by client name; anything absent falls back to initials, which is the shape
   *  the real component needs anyway since no agency has a logo for every client. */
  clientLogos: z.record(z.string(), z.string()),

  /** Repeated UI copy (CLAUDE.md UI writing rules — sentence case, plain verbs). */
  copy: z.object({
    status: z.object({
      drafted: z.string(),
      reviewed: z.string(),
      sent: z.string(),
    }),
    /** How an un-reached stage reads on the narrative timeline. The absence of a
     *  timestamp is the information; this names it. */
    statusPending: z.object({
      reviewed: z.string(),
      sent: z.string(),
    }),
    actionByStatus: z.object({
      drafted: z.string(),
      reviewed: z.string(),
      sent: z.string(),
    }),
    sourceLabel: z.object({
      googleAds: z.string(),
      tracker: z.string(),
    }),
    cadenceLabel: z.object({
      daily: z.string(),
      weekly: z.string(),
      "weekly-lite": z.string(),
      monthly: z.string(),
    }),
    channelLabel: z.object({
      whatsapp: z.string(),
      email: z.string(),
    }),
    /** Auth. No Figma frame yet; wording lives here so the eventual redesign is
     *  a component change, not a copy hunt. */
    auth: z.object({
      signInBody: z.string(),
      signInCta: z.string(),
      emailLabel: z.string(),
      passwordLabel: z.string(),
      setUpBody: z.string(),
      setUpCta: z.string(),
      nameLabel: z.string(),
      newPasswordLabel: z.string(),
      passwordHint: z.string(),
      inviteOnly: z.string(),
      noClients: z.string(),
      noClientsBody: z.string(),
      completingInvite: z.string(),
      linkProblem: z.string(),
      expiredLink: z.string(),
      linkIncomplete: z.string(),
      linkFailed: z.string(),
      backToSignIn: z.string(),
    }),
    admin: z.object({
      title: z.string(),
      invite: z.string(),
      inviteCta: z.string(),
      inviteSent: z.string(),
      revoke: z.string(),
      restore: z.string(),
      revoked: z.string(),
      assignTitle: z.string(),
      assignBody: z.string(),
      noBuyers: z.string(),
      pending: z.string(),
      pendingBody: z.string(),
    }),
    /** The add-client form. Field labels are nouns, hints say what the value
     *  DOES rather than restating the label. */
    addClient: z.object({
      cta: z.string(),
      title: z.string(),
      lede: z.string(),
      identity: z.string(),
      nameLabel: z.string(),
      nameHint: z.string(),
      tabLabel: z.string(),
      tabHint: z.string(),
      tabMissing: z.string(),
      tabTaken: z.string(),
      tabMatched: z.string(),
      tabFixture: z.string(),
      tabUnreadable: z.string(),
      domainLabel: z.string(),
      domainHint: z.string(),
      descriptorLabel: z.string(),
      descriptorHint: z.string(),
      reporting: z.string(),
      sourceLabel: z.string(),
      sourceHint: z.string(),
      currencyLabel: z.string(),
      timezoneLabel: z.string(),
      timezoneHint: z.string(),
      cadenceLabel: z.string(),
      anchorLabel: z.string(),
      anchorHint: z.string(),
      timeLabel: z.string(),
      channelLabel: z.string(),
      coverLabel: z.string(),
      coverHint: z.string(),
      coverNone: z.string(),
      coverEmpty: z.string(),
      submit: z.string(),
      submitting: z.string(),
      created: z.string(),
      cancel: z.string(),
    }),
    /** The admin's oversight page. Read-only by design: the admin only
     *  oversees, so every row points at the work rather than doing it. */
    overview: z.object({
      title: z.string(),
      heading: z.string(),
      lede: z.string(),
      deliveryTitle: z.string(),
      deliveryBody: z.string(),
      sentSuffix: z.string(),
      lateSuffix: z.string(),
      state: z.object({
        sent: z.string(),
        due: z.string(),
        late: z.string(),
        unscheduled: z.string(),
      }),
      nobody: z.string(),
      noClients: z.string(),
      coverageTitle: z.string(),
      coverageBody: z.string(),
      uncovered: z.string(),
      uncoveredSuffix: z.string(),
      allCovered: z.string(),
      noBuyers: z.string(),
      noClientsYet: z.string(),
      riskTitle: z.string(),
      riskBody: z.string(),
      riskTracker: z.string(),
      riskUnconfirmed: z.string(),
      riskFlags: z.string(),
    }),
    /** Setting up an empty agency. Steps are ordered by dependency, not by
     *  importance — see AdminFirstRun. */
    firstRun: z.object({
      title: z.string(),
      body: z.string(),
      doneSuffix: z.string(),
      inviteTitle: z.string(),
      inviteBody: z.string(),
      clientTitle: z.string(),
      clientBody: z.string(),
      assignTitle: z.string(),
      assignBody: z.string(),
      assignCta: z.string(),
      complete: z.string(),
    }),
    /** The accountability grid. */
    logs: z.object({
      title: z.string(),
      body: z.string(),
      clientColumn: z.string(),
      confirmedColumn: z.string(),
      confirmed: z.string(),
      staged: z.string(),
      missing: z.string(),
      notDue: z.string(),
      edited: z.string(),
      unassigned: z.string(),
      unassignedNote: z.string(),
      noClients: z.string(),
      state: z.object({
        confirmed: z.string(),
        staged: z.string(),
        missing: z.string(),
        notDue: z.string(),
      }),
    }),
    /** The weekly reconciliation. */
    review: z.object({
      title: z.string(),
      lede: z.string(),
      logged: z.string(),
      actual: z.string(),
      confirmedDays: z.string(),
      reviewedBy: z.string(),
      noteOptional: z.string(),
      noteRequired: z.string(),
      notePlaceholder: z.string(),
      enterActuals: z.string(),
      saving: z.string(),
      saved: z.string(),
      noClients: z.string(),
      status: z.object({
        pending: z.string(),
        verified: z.string(),
        discrepancy: z.string(),
      }),
      markAs: z.object({
        pending: z.string(),
        verified: z.string(),
        discrepancy: z.string(),
      }),
    }),
    /** The per-client logo control. */
    logo: z.object({
      title: z.string(),
      none: z.string(),
      noDomain: z.string(),
      upload: z.string(),
      refetch: z.string(),
      clear: z.string(),
      working: z.string(),
      uploaded: z.string(),
      refetched: z.string(),
      cleared: z.string(),
      tooBig: z.string(),
      unreadable: z.string(),
      domainLabel: z.string(),
      domainSaved: z.string(),
      explainer: z.string(),
      source: z.object({
        upload: z.string(),
        "google-ads": z.string(),
        website: z.string(),
      }),
    }),
    dismissReasonPlaceholder: z.string(),
    dismissReasonRequired: z.string(),
    dismissedPrefix: z.string(),
    resolvedNote: z.string(),
    splitView: z.object({
      draftLabel: z.string(),
      evidenceLabel: z.string(),
      clearLabel: z.string(),
      editDraft: z.string(),
      saveDraft: z.string(),
      markReviewed: z.string(),
      backToDraft: z.string(),
      send: z.string(),
      sentToastPrefix: z.string(), // + client name
      copy: z.string(),
      copiedToastPrefix: z.string(), // + tone label
      previewShow: z.string(),
      previewHide: z.string(),
      paragraphCountError: z.string(),
      emailSignoff: z.string(),
      signature: z.string(),
    }),
    daily: z.object({
      bandTitle: z.string(),
      compiledAt: z.string(),
      confirm: z.string(),
      confirmed: z.string(),
      confirmedToast: z.string(),
      edit: z.string(),
      overridePlaceholder: z.string(),
      overrideRequired: z.string(),
      recompile: z.string(),
      allConfirmed: z.string(),
      noRows: z.string(),
      noRowsBody: z.string(),
      editedPrefix: z.string(),
      chipNotCompiled: z.string(),
      chipAbsent: z.string(),
      chipStale: z.string(),
      working: z.string(),
      cooldown: z.string(),
      goToTracker: z.string(),
      blockedFromClient: z.string(),
      goesToClient: z.string(),
      unavailableNote: z.string(),
    }),
    library: z.object({
      title: z.string(),
      searchPlaceholder: z.string(),
      allClients: z.string(),
      allTypes: z.string(),
      empty: z.string(),
      emptyBody: z.string(),
      noResults: z.string(),
      noResultsBody: z.string(),
      openLive: z.string(),
    }),
    artifactTypeLabel: z.object({
      commentary: z.string(),
      answer: z.string(),
      loom_brief: z.string(),
    }),
    answerDesk: z.object({
      title: z.string(),
      pickClient: z.string(),
      pickClientBody: z.string(),
      inputPlaceholder: z.string(),
      answerButton: z.string(),
      supportingData: z.string(),
      emptyThread: z.string(),
      emptyThreadBody: z.string(),
      answeredToast: z.string(),
      waitingBadge: z.string(),
    }),
    loom: z.object({
      title: z.string(),
      subtitle: z.string(),
      riskLabel: z.string(),
      winLabel: z.string(),
      copyAsText: z.string(),
      copiedToast: z.string(),
      stopsHere: z.string(), // product-voice requirement — do not cut
      openBrief: z.string(),
      oneSentenceError: z.string(),
    }),
    actions: z.object({
      save: z.string(),
      cancel: z.string(),
      edit: z.string(),
      remove: z.string(),
      saved: z.string(),
      dismiss: z.string(),
      confirmDismiss: z.string(),
      editSend: z.string(),
    }),
    sensitivityTypeLabel: z.object({
      framing: z.string(),
      cadence: z.string(),
      "metric-avoidance": z.string(),
      tone: z.string(),
    }),
    stakeholderGetsLabel: z.object({
      short: z.string(),
      full: z.string(),
      deck: z.string(),
    }),
    today: z.object({
      greetingPrefix: z.string(),
      greeting: z.string(),
      firstRunSubline: z.string(),
      waitingTitle: z.string(),
      flagsTitle: z.string(),
      dueTitle: z.string(),
      dueEmpty: z.string(),
      dueEmptyBody: z.string(),
      emptyTitle: z.string(),
      emptyBody: z.string(),
      emptyCta: z.string(),
    }),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

const deltaPolarity: Record<MetricKey, z.infer<typeof MetricPolaritySchema>> = {
  spend: "neutral",
  sales: "higher_is_better",
  revenue: "higher_is_better",
  roas: "higher_is_better",
  nc_roas: "higher_is_better",
  conversions: "higher_is_better",
  aov: "higher_is_better",
  cpa_cpo: "lower_is_better",
  ncac: "lower_is_better",
  cpc: "lower_is_better",
  // NVP: tracker column 8. The workbook shows it as a percentage (73–80%),
  // which rules out Net Variable Profit; it reads as a new-visitor/new-customer
  // share. Treated as higher-is-better alongside the other new-customer
  // metrics — confirm the expansion and this flips in one line if wrong.
  nvp: "higher_is_better",
};

export const config: Config = ConfigSchema.parse({
  motion: { fast: 140, base: 220 },
  deltaPolarity,
  pageSizes: { library: 25, timeline: 20, dueRecentDays: 7 },
  currency: {
    default: "USD",
    locale: {
      USD: "en-US",
      EUR: "de-DE",
      GBP: "en-GB",
      AED: "en-AE",
    },
  },
  timezone: "Asia/Dubai", // GST (UTC+4)
  splitView: {
    paneSplitPct: 58, // design.md §4.3: 58% draft / 42% evidence
    dimOpacity: 0.45, // design.md §3 EvidenceCard dimmed state
    settleTranslatePx: 2, // claim→evidence highlight "settle"
    mobileBreakpointPx: 768, // Tailwind md — panes stack below this
  },
  voice: {
    demoBuyerKey: "demo-buyer",
  },
  daily: {
    pullHour: 2, // 02:00 — day ended, initial attribution settled
    deliverHour: 8, // buyer's start time
    readyLeadHours: 2, // digest waiting from 06:00
    retryAttempts: 3,
    retryGapMinutes: 15,
    numbersWindowDays: 14, // the agency's own rolling-chart window
    recompileCooldownSeconds: 20,
  },
  flags: {
    targetBreachPct: 10,
    daySwingPct: 30,
    swingBaselineDays: 7,
    sustainedDriftDays: 3,
    sustainedDriftMinPct: 5,
    dailyTargetDivisor: 7,
    /** How far a client's newest DATA row may fall behind yesterday before its
     *  source counts as stopped. One missing day is a buyer filling in late;
     *  three or more is a dead source, and metric flags raised from data that
     *  old can no longer be evaluated either way. */
    staleSourceDays: 2,
  },
  ingestion: {
    sourceOfTruthPrefix: "Source of truth:",
    dateHeader: "Date",
    columnToMetric: {
      Spend: "spend",
      // The agency says "Sales"; Relay's internal key for order count is
      // `conversions` (what KPIs and seeded evidence use). This map is exactly
      // where their vocabulary meets ours — same pattern as KPI label → mapsTo.
      Sales: "conversions",
      Revenue: "revenue",
      ROAS: "roas",
      "CPA/CPO": "cpa_cpo",
      "NC ROAS": "nc_roas",
      NCAC: "ncac",
      NVP: "nvp",
    },
    aggregation: {
      spend: "sum",
      conversions: "sum",
      revenue: "sum",
      roas: "derived", // Σrevenue / Σspend — never the mean of daily ratios
      cpa_cpo: "derived", // Σspend / Σsales
      nc_roas: "last", // components not in the tracker
      ncac: "last",
      nvp: "last",
    },
    ignoredTabs: ["Instructions", "Assigned Media Buyer"],
    dryRunTolerancePct: 0.5,
    fixturePath: "supabase/fixtures/tracker.json",
  },
  clientLogos: {
    Northbrook: "/logos/shopify.svg",
    Birkenstock: "/logos/shopify.svg",
    Switchup: "/logos/shopify.svg",
    // Huggers deliberately has none — the initials fallback stays on screen.
  },

  copy: {
    status: { drafted: "Drafted", reviewed: "Reviewed", sent: "Sent" },
    statusPending: { reviewed: "Not yet reviewed", sent: "Not yet sent" },
    actionByStatus: {
      drafted: "Review draft",
      reviewed: "Send",
      sent: "View sent",
    },
    sourceLabel: { googleAds: "Google Ads", tracker: "Tracker" },
    cadenceLabel: {
      daily: "Daily",
      weekly: "Weekly",
      "weekly-lite": "Weekly-lite",
      monthly: "Monthly",
    },
    channelLabel: { whatsapp: "WhatsApp", email: "Email" },
    auth: {
      signInBody: "Sign in to your agency's workspace.",
      signInCta: "Sign in",
      emailLabel: "Work email",
      passwordLabel: "Password",
      setUpBody: "Set a password to finish setting up your account.",
      setUpCta: "Finish setup",
      nameLabel: "Your name",
      newPasswordLabel: "Choose a password",
      passwordHint: "At least 8 characters.",
      inviteOnly: "Relay is invite-only. Ask your agency admin for access.",
      /* First run, seen by a BUYER. Covers two situations that look identical
         from here — no clients exist yet, or clients exist but none are yours —
         because the buyer's next move is the same either way: ask. Deliberately
         no CTA; a button a buyer cannot use is worse than no button. */
      noClients: "No clients assigned to you yet",
      noClientsBody:
        "Your agency admin assigns the clients you cover. As soon as one is, yesterday's numbers appear here each morning.",
      completingInvite: "Signing you in…",
      linkProblem: "That link didn't work.",
      /* Supabase deliberately does not say whether a link expired or was already
         used, and neither should we — both have the same fix. */
      expiredLink:
        "That link has expired or was already used. Ask your agency admin to send another invite.",
      linkIncomplete:
        "That link is missing its sign-in details. Open it directly from the invite email rather than pasting the address.",
      linkFailed:
        "We couldn't finish signing you in. Try the link again, or ask your agency admin for a new invite.",
      backToSignIn: "Go to sign in",
    },
    admin: {
      title: "Team",
      invite: "Invite a media buyer",
      inviteCta: "Send invite",
      inviteSent: "Invite sent",
      revoke: "Revoke access",
      restore: "Restore access",
      revoked: "Revoked",
      assignTitle: "Clients",
      assignBody:
        "A buyer sees only the clients assigned to them. A client can have more than one.",
      noBuyers: "No buyers yet — invite one above.",
      pending: "Invited",
      pendingBody: "Hasn't finished setting up yet. You can assign clients now.",
    },
    addClient: {
      cta: "Add a client",
      title: "Add a client",
      lede: "Relay reads this client's numbers from the tracker workbook. Everything below decides what it reads and who sees it.",
      identity: "Identity",
      nameLabel: "Client name",
      nameHint: "What Relay calls them on every screen.",
      tabLabel: "Tracker tab",
      tabHint: "The tab Relay reads their numbers from.",
      tabMissing: "No tab with that name in the workbook.",
      tabTaken: "Another client already reads that tab.",
      tabMatched: "Found in the workbook.",
      tabFixture:
        "Reading the local fixture — the live workbook isn't configured yet.",
      tabUnreadable:
        "Couldn't read the workbook, so the tab can't be checked here.",
      domainLabel: "Website",
      domainHint: "Used to find their logo. Optional.",
      descriptorLabel: "Descriptor",
      descriptorHint: "One line, in the client's own terms. Optional.",
      reporting: "Reporting",
      sourceLabel: "Source of truth",
      sourceHint: "Which platform settles a disagreement about a number.",
      currencyLabel: "Currency",
      timezoneLabel: "Account timezone",
      timezoneHint:
        "Where their day ends. A Dubai account rolls over four hours before a London one.",
      cadenceLabel: "Cadence",
      anchorLabel: "Send day",
      anchorHint:
        "When the update is expected, in the client's own timezone. After this, Relay calls it late.",
      timeLabel: "Send time",
      channelLabel: "Channel",
      coverLabel: "Who covers them",
      coverHint:
        "A buyer sees only the clients assigned to them, so a client with nobody on it is invisible.",
      coverNone: "Nobody yet — this client won't appear on anyone's Today.",
      coverEmpty: "No buyers to assign. Invite one from the team page first.",
      submit: "Add client",
      submitting: "Adding…",
      created: "Client added",
      cancel: "Cancel",
    },
    overview: {
      title: "Overview",
      heading: "Where the agency stands this week",
      lede: "What has gone out, who is covering what, and what is quietly waiting on somebody.",
      deliveryTitle: "This week's client updates",
      deliveryBody:
        "Late means the agreed moment has passed in the client's own timezone and nothing has been sent.",
      sentSuffix: "sent",
      lateSuffix: "late",
      state: {
        sent: "Sent",
        due: "Due",
        late: "Late",
        unscheduled: "No send day",
      },
      nobody: "Nobody assigned",
      noClients: "No clients yet.",
      coverageTitle: "Coverage",
      coverageBody:
        "A buyer sees only the clients assigned to them, so a client with nobody on it is a client nobody is working on.",
      uncovered: "Uncovered",
      uncoveredSuffix: "uncovered",
      allCovered: "All covered",
      noBuyers: "No buyers yet — invite one from the team page.",
      noClientsYet: "No clients yet",
      riskTitle: "Waiting on somebody",
      riskBody:
        "None of this is urgent this minute. All of it stops being fixable if it is left.",
      riskTracker: "No usable row",
      riskUnconfirmed: "Unconfirmed",
      riskFlags: "Open flags",
    },
    firstRun: {
      title: "Setting up",
      body: "Three things, in this order — a client added before there is anyone to carry it starts out invisible.",
      doneSuffix: "done",
      inviteTitle: "Invite your media buyers",
      inviteBody:
        "They sign in with their own email and see only what you assign them.",
      clientTitle: "Add your clients",
      clientBody:
        "Each one reads a tab of the tracker workbook. You can assign a buyer on the same screen.",
      assignTitle: "Make sure everyone is covered",
      assignBody:
        "A client with nobody on it never appears on anyone's Today, so nobody works on it.",
      assignCta: "Assign clients",
      complete:
        "Set up. Relay compiles yesterday's numbers each morning; your buyers confirm them and send the Monday update.",
    },
    logs: {
      title: "Daily logs",
      body: "One cell per client per day. A buyer who has stopped confirming shows up as a band long before it would be noticed client by client.",
      clientColumn: "Client",
      confirmedColumn: "Confirmed",
      confirmed: "Confirmed",
      staged: "Not confirmed",
      missing: "No row",
      notDue: "Not due yet",
      edited: "number changed, with a reason",
      unassigned: "Nobody assigned",
      unassignedNote: "— no one is accountable for these",
      noClients: "No clients assigned.",
      state: {
        confirmed: "Confirmed",
        staged: "Compiled, not confirmed",
        missing: "No usable row",
        notDue: "The day hasn't ended for this client yet",
      },
    },
    review: {
      title: "Weekly review",
      lede: "What the buyers logged, against what the platform actually reported. Review whenever you have time — nothing here runs on a schedule.",
      logged: "Logged",
      actual: "Actual",
      confirmedDays: "days confirmed",
      reviewedBy: "reviewed by",
      noteOptional: "Note (optional)",
      noteRequired: "What's the discrepancy? (required to save it as one)",
      notePlaceholder: "e.g. mid-week budget change, refunds posted late",
      enterActuals: "Enter the platform's figures to compare.",
      saving: "Saving…",
      saved: "Review saved",
      noClients: "No clients to review.",
      status: {
        pending: "Not reviewed",
        verified: "Verified",
        discrepancy: "Discrepancy",
      },
      markAs: {
        pending: "Save",
        verified: "Mark verified",
        discrepancy: "Flag discrepancy",
      },
    },
    logo: {
      title: "Logo",
      none: "No logo — showing initials",
      noDomain: "Add a website to look one up.",
      upload: "Upload",
      refetch: "Look up again",
      clear: "Remove",
      working: "Looking…",
      uploaded: "Logo updated",
      refetched: "Logo updated",
      cleared: "Logo removed",
      tooBig: "That image is over 2 MB.",
      unreadable: "That file could not be read.",
      domainLabel: "Website",
      domainSaved: "Website saved",
      explainer:
        "Fetched once and stored, never loaded from the client's own site when a page renders.",
      source: {
        upload: "Uploaded",
        "google-ads": "From Google Ads",
        website: "Found on their website",
      },
    },
    dismissReasonPlaceholder: "Why are you dismissing this? (required)",
    dismissReasonRequired: "A reason is required before dismissing.",
    dismissedPrefix: "Dismissed —",
    resolvedNote: "The condition no longer holds as of the latest compile.",
    splitView: {
      draftLabel: "Draft — select any sentence to see its evidence",
      evidenceLabel: "Evidence · this week",
      clearLabel: "Clear · Esc",
      editDraft: "Edit draft",
      saveDraft: "Save draft",
      markReviewed: "Mark reviewed",
      backToDraft: "Back to draft",
      send: "Send",
      sentToastPrefix: "Sent — pinned to", // + " {client}'s timeline"
      copy: "Copy",
      copiedToastPrefix: "Copied for", // + " {tone}"
      previewShow: "Preview",
      previewHide: "Hide preview",
      paragraphCountError:
        "Keep the same number of paragraphs — each maps to a claim. Structural editing comes later.",
      emailSignoff: "Any questions, just reply here — happy to jump on a call.",
      signature: "— B",
    },
    daily: {
      bandTitle: "Yesterday",
      compiledAt: "Compiled",
      confirm: "Confirm",
      confirmed: "Confirmed",
      confirmedToast: "Confirmed",
      edit: "Edit numbers",
      overridePlaceholder: "What did you change, and why? (required)",
      overrideRequired: "Changing a pulled number requires a reason.",
      recompile: "Re-run Compile",
      allConfirmed: "All confirmed — nothing waiting on you.",
      noRows: "Nothing compiled yet",
      noRowsBody:
        "Run the compile to stage yesterday's numbers for every client.",
      editedPrefix: "Edited on confirm —",
      chipNotCompiled: "Needs compilation",
      chipAbsent: "No data found in google sheet",
      chipStale: "Newest row is an older day",
      working: "Working…",
      cooldown: "Just ran — give it a moment",
      goToTracker: "The row needs filling in the tracker.",
      blockedFromClient:
        "Internal only — this client's profile forbids a daily note.",
      goesToClient: "Cleared for a daily note to this client",
      unavailableNote: "Not available",
    },
    library: {
      title: "Library",
      searchPlaceholder: "Search everything you've sent…",
      allClients: "All clients",
      allTypes: "All types",
      empty: "Nothing archived yet",
      emptyBody:
        "Commentary, answers, and Loom briefs land here as you send them — searchable across every client.",
      noResults: "Nothing matches those filters",
      noResultsBody: "Try a broader search or clear a filter.",
      openLive: "Open",
    },
    artifactTypeLabel: {
      commentary: "Commentary",
      answer: "Answer",
      loom_brief: "Loom brief",
    },
    answerDesk: {
      title: "Answer Desk",
      pickClient: "Pick a client to open their desk",
      pickClientBody:
        "The desk is always scoped to one client's data — answers are grounded, never general.",
      inputPlaceholder: "Ask, or paste a client's question…",
      answerButton: "Answer",
      supportingData: "Supporting data",
      emptyThread: "No questions yet",
      emptyThreadBody:
        "Paste the next question this client sends you — the answer comes back grounded in their own numbers.",
      answeredToast: "Answered",
      waitingBadge: "Waiting",
    },
    loom: {
      title: "Loom brief",
      subtitle: "Glance at this before you hit record — don't read it aloud.",
      riskLabel: "Risk",
      winLabel: "Win",
      copyAsText: "Copy as text",
      copiedToast: "Copied as text",
      stopsHere:
        "Record and send from wherever you usually do — Relay stops here.",
      openBrief: "Loom brief",
      oneSentenceError: "Keep it to one sentence — the brief stays glanceable.",
    },
    actions: {
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      remove: "Remove",
      saved: "Saved",
      dismiss: "Dismiss",
      confirmDismiss: "Confirm dismiss",
      editSend: "Edit & send",
    },
    sensitivityTypeLabel: {
      framing: "Framing",
      cadence: "Cadence",
      "metric-avoidance": "Metric avoidance",
      tone: "Tone",
    },
    stakeholderGetsLabel: {
      short: "Short version",
      full: "Full version",
      deck: "Deck",
    },
    today: {
      greetingPrefix: "Hey",
      greeting: "Here's your week",
      /* The line under the greeting when there is no week yet to introduce
         (node 376:1678, first-run variants). */
      firstRunSubline: "Let's get started",
      waitingTitle: "Waiting on you",
      flagsTitle: "Flags",
      dueTitle: "Due this week",
      dueEmpty: "All caught up",
      dueEmptyBody:
        "No outstanding drafts and nothing scheduled for this week. Drafts appear here as the week's data lands.",
      /* First run, seen by an ADMIN — the only role that can fix it. "Connect a
         client" was written before the access model existed and implied whoever
         read it could do the connecting; a buyer cannot. This names both halves
         of the job, because a client with no buyer assigned to it still shows
         nobody anything. */
      emptyTitle: "No clients yet",
      emptyBody:
        "Add a client, then assign the buyer who covers them. The first digest arrives the next morning.",
      emptyCta: "Add a client",
    },
  },
});

// --- Formatters (reference the validated config above) ----------------------

const localeFor = (currency: Currency): string =>
  config.currency.locale[currency] ??
  config.currency.locale[config.currency.default];

/** Full currency, e.g. $26.40. Per-client currency; USD default. */
export function formatCurrency(
  value: number,
  currency: Currency = "USD",
): string {
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
  }).format(value);
}

/** Compact currency, e.g. $39.8K, for large evidence values. */
export function formatCompactCurrency(
  value: number,
  currency: Currency = "USD",
): string {
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** A period as "Jul 6–12" (uses the stored label when present). */
export function formatPeriod(
  start: string,
  end: string,
  label?: string,
): string {
  if (label) return label;
  const s = parseISO(start);
  const e = parseISO(end);
  const sameMonth = format(s, "MMM") === format(e, "MMM");
  return sameMonth
    ? `${format(s, "MMM d")}–${format(e, "d")}`
    : `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
}

/** "as of" timestamp for evidence freshness footers, in the working timezone. */
export function formatAsOf(iso: string): string {
  return format(parseISO(iso), "MMM d, h:mmaaa");
}

/** Age of an item relative to now (e.g. "2 hours"). Deterministic in pilot
 *  clock mode; real elapsed time otherwise. See lib/clock.ts. */
export function formatAge(iso: string): string {
  return formatDistanceStrict(parseISO(iso), now());
}

type CadenceLike = { primary: "daily" | "weekly" | "weekly-lite" | "monthly" };

/** "Weekly · WhatsApp" style cadence + channel line for client rows. */
export function formatCadenceLine(
  cadence: CadenceLike,
  channel: "whatsapp" | "email",
): string {
  return `${config.copy.cadenceLabel[cadence.primary]} · ${config.copy.channelLabel[channel]}`;
}
