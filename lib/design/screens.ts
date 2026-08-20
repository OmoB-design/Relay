import { clientProfiles, narratives } from "@/lib/seed";

/* ============================================================================
   State matrices for the five screens Today's catalogue did not cover.

   WHY THESE ARE MATRICES AND NOT LIVE SPECIMENS. Today's frames render the real
   components because their props are small and serialisable. These five are
   screen-level compositions whose props are whole data contexts — a narrative
   plus its snapshot plus its client graph — and almost every state they can be in
   is INTERNAL: a selected claim, an open editor, a chosen filter, a picked tone.
   Fabricating a context would not surface those anyway; you would still have to
   click. So each state names itself, states the condition that produces it, and
   says how to reach it on the real route, which already runs on real data.

   The slug is the contract. Name the Figma frame the same thing and the mapping
   back to code needs no interpretation — the same convention that made the digest
   and flag handoffs mechanical.

   A screen is not ready to redesign until every slug below has a frame. Designing
   only the populated state is how you ship a screen that breaks the first morning
   the tracker is late.
   ========================================================================== */

const NB = clientProfiles[0].id;
const NB_NARRATIVE = narratives[0].id;
const BK = clientProfiles[1].id;

export type ScreenState = {
  /** The contract. Use verbatim as the Figma frame name. */
  slug: string;
  title: string;
  /** The condition that produces this state. */
  when: string;
  /** How to reach it on the live route. Omit when it is the default view. */
  reach?: string;
  /** Marks a state that is deliberately NOTHING — design the gap, not a card. */
  collapses?: boolean;
};

export type ScreenSpec = {
  key: string;
  title: string;
  /** The live route, on real data. */
  href: string;
  blurb: string;
  /** Components already rendered in /design/components that make up this screen. */
  builtFrom: string[];
  groups: { title: string; blurb?: string; states: ScreenState[] }[];
};

export const SCREENS: ScreenSpec[] = [
  {
    key: "client",
    title: "Client workspace",
    href: `/clients/${NB}`,
    blurb:
      "Four tabs over one client: Timeline, Numbers, Drafts, Profile. The widest matrix after Today, because the Profile tab is four independent editors and each has an add, an edit and a delete.",
    builtFrom: [
      "WorkspaceTabs",
      "TimelineFeed",
      "NumbersTab",
      "StatusWord",
      "KpiList",
      "SensitivityEditor",
      "StakeholderList",
      "CommsControls",
      "SensitivityChip",
      "HealthDot",
      "Sparkline",
      "EmptyState",
    ],
    groups: [
      {
        title: "Shell",
        states: [
          {
            slug: "client/header",
            title: "Client header",
            when: "Always — name, descriptor, account health, source of truth",
          },
          {
            slug: "client/tabs",
            title: "Tab bar",
            when: "Four tabs; the active one is the only affordance that changes",
          },
          {
            slug: "client/not-found",
            title: "Unknown client id",
            when: "A stale bookmark or a deleted client. Must not render an empty shell.",
          },
        ],
      },
      {
        title: "Timeline",
        blurb:
          "What Relay has said to this client over time, each entry pinned to the snapshot it was written against.",
        states: [
          {
            slug: "client/timeline",
            title: "Populated",
            when: "One or more entries, newest first",
          },
          {
            slug: "client/timeline-entry-expanded",
            title: "Entry expanded",
            when: "The full artifact text, with its snapshot button",
            reach: "Click any entry",
          },
          {
            slug: "client/timeline-flag-entry",
            title: "Flag entry",
            when: "type = flag — reads differently from commentary",
          },
          {
            slug: "client/timeline-empty",
            title: "Nothing tracked yet",
            when: "A newly connected client",
          },
        ],
      },
      {
        title: "Numbers",
        blurb:
          "The trailing daily window as a scannable table with per-metric sparklines.",
        states: [
          {
            slug: "client/numbers",
            title: "Populated",
            when: "Daily rows exist for the window",
          },
          {
            slug: "client/numbers-vs-target",
            title: "Against target",
            when: "A KPI exists for the metric — the delta is coloured by polarity, not by sign",
          },
          {
            slug: "client/numbers-unavailable",
            title: "Metric unavailable",
            when: "The source returned nothing. States the reason; never a stand-in zero.",
          },
          {
            slug: "client/numbers-segments",
            title: "Segment switch",
            when: "overall / branded / non-branded — a blended ROAS of 1.60 can hide 3.58 branded and 0.79 non-branded",
            reach: "Segment control at the top of the tab",
          },
          {
            slug: "client/numbers-empty",
            title: "No daily numbers yet",
            when: "No compile has run for this client",
          },
        ],
      },
      {
        title: "Drafts",
        states: [
          {
            slug: "client/drafts",
            title: "Populated",
            when: "One row per narrative, with its status word and next action",
          },
          {
            slug: "client/drafts-empty",
            title: "No narratives yet",
            when: "No draft has been generated for this client",
          },
        ],
      },
      {
        title: "Profile — the client graph",
        blurb:
          "Four editors. Each needs its read, add, edit and delete states, plus its own empty. This is where most of the frames are.",
        states: [
          {
            slug: "client/kpis",
            title: "KPIs — read",
            when: "Target and polarity per metric. Polarity decides whether a rise is good news.",
          },
          {
            slug: "client/kpis-add",
            title: "KPIs — add",
            when: "Adding a KPI",
            reach: "Add KPI",
          },
          {
            slug: "client/kpis-edit",
            title: "KPIs — edit / delete",
            when: "Editing an existing row",
            reach: "Edit on any KPI row",
          },
          {
            slug: "client/kpis-empty",
            title: "KPIs — none",
            when: "No KPI set. Nothing can breach a target that does not exist, so flags go quiet.",
          },
          {
            slug: "client/sensitivities",
            title: "Sensitivities — read",
            when: "Standing rules about how to talk to this client. Four types.",
          },
          {
            slug: "client/sensitivities-edit",
            title: "Sensitivities — add / edit",
            when: "Editing a rule",
            reach: "Add or edit a sensitivity",
          },
          {
            slug: "client/stakeholders",
            title: "Stakeholders — read",
            when: "Who receives what. `gets` controls the depth of the version they see.",
          },
          {
            slug: "client/stakeholders-edit",
            title: "Stakeholders — add / edit",
            when: "Editing a recipient",
            reach: "Add or edit a stakeholder",
          },
          {
            slug: "client/comms",
            title: "Cadence and channel",
            when: "Changing cadence changes which drafts Relay expects to exist",
          },
          {
            slug: "client/daily-to-client",
            title: "Daily-note permission",
            when: "Governs whether a client-facing daily note may leave the building. Drives the digest's 'Cleared for' / 'Internal only' line.",
          },
        ],
      },
    ],
  },

  {
    key: "narrative",
    title: "Narrative split view",
    href: `/clients/${NB}/narratives/${NB_NARRATIVE}`,
    blurb:
      "Draft prose on the left, evidence on the right, stitched by selection. The most distinctive interaction in Relay, and the screen where colour is load-bearing rather than decorative.",
    builtFrom: [
      "NarrativeSplitView",
      "ClaimSpan",
      "EvidenceCard",
      "Sparkline",
      "SnapshotButton",
      "StatusTimeline",
      "SensitivityChip",
    ],
    groups: [
      {
        title: "The stitch",
        blurb:
          "Selection in either direction. This is the whole argument of the product: every factual sentence is traceable to a number, and the traceability is visible.",
        states: [
          {
            slug: "narrative/idle",
            title: "Nothing selected",
            when: "Landing state. Every fact carries its underline; nothing is dimmed.",
          },
          {
            slug: "narrative/claim-selected",
            title: "Claim selected",
            when: "A sentence is picked — its evidence goes solid, everything else dims",
            reach: "Click any underlined sentence",
          },
          {
            slug: "narrative/evidence-selected",
            title: "Evidence selected",
            when: "Reverse direction — an evidence card is picked and every claim citing it highlights",
            reach: "Click an evidence card",
          },
          {
            slug: "narrative/cleared",
            title: "Cleared",
            when: "Escape, or the clear affordance. Returns to idle.",
          },
          {
            slug: "narrative/fact-vs-plan",
            title: "Fact vs plan",
            when: "A plan carries NO underline because it cites nothing. Enforced in the type system, the schema and a database CHECK — the one distinction that must survive any redesign.",
          },
        ],
      },
      {
        title: "Editing",
        states: [
          {
            slug: "narrative/editing",
            title: "Edit draft",
            when: "Prose editable in place",
            reach: "Edit draft",
          },
          {
            slug: "narrative/edit-invalid",
            title: "Paragraph count wrong",
            when: "The edit breaks the claim-per-paragraph mapping — blocked, with the reason stated",
            reach: "Edit draft, then merge or delete a paragraph",
          },
          {
            slug: "narrative/edit-saved",
            title: "Saved",
            when: "The edit is banked as a voice-profile diff — Relay learns the buyer's phrasing",
          },
        ],
      },
      {
        title: "Lifecycle",
        blurb:
          "Reviewing and sending are the only irreversible-feeling actions in the app.",
        states: [
          {
            slug: "narrative/drafted",
            title: "Drafted",
            when: "Relay wrote it; nobody has read it. Primary action: Mark reviewed.",
          },
          {
            slug: "narrative/reviewed",
            title: "Reviewed",
            when: "A human approved it. Primary action: Send. Secondary: Back to draft.",
          },
          {
            slug: "narrative/sent",
            title: "Sent",
            when: "Done. No primary action remains; the timeline records when.",
          },
          {
            slug: "narrative/unreview",
            title: "Back to draft",
            when: "Un-reviewing a reviewed narrative. sentAt must survive untouched.",
            reach: "Back to draft on a reviewed narrative",
          },
        ],
      },
      {
        title: "Output",
        states: [
          {
            slug: "narrative/tone-slack",
            title: "Slack tone",
            when: "Condensed variant — short paragraphs, no signature",
          },
          {
            slug: "narrative/tone-email",
            title: "Email tone",
            when: "Greeting, sign-off, signature",
          },
          {
            slug: "narrative/preview",
            title: "Preview open",
            when: "What the client will actually receive",
            reach: "Show preview",
          },
          {
            slug: "narrative/copied",
            title: "Copied",
            when: "Confirmation that the text is on the clipboard",
          },
        ],
      },
      {
        title: "Responsive & absence",
        states: [
          {
            slug: "narrative/mobile",
            title: "Below the split breakpoint",
            when: "Evidence becomes a sheet rather than a column",
            reach: "Narrow the window under 900px",
          },
          {
            slug: "narrative/missing-days",
            title: "Period has gaps",
            when: "The snapshot's label says so — Relay never interpolates a missing day",
          },
          {
            slug: "narrative/not-found",
            title: "Unknown narrative id",
            when: "A stale link",
          },
        ],
      },
    ],
  },

  {
    key: "loom",
    title: "Loom brief",
    href: `/clients/${NB}/narratives/${NB_NARRATIVE}/loom`,
    blurb:
      "The one-page recording-prep artifact: three headlines, one risk, one win. Relay produces the brief only — never the video, the upload, or the send.",
    builtFrom: [
      "LoomBriefView",
      "LoomHeadlineCard",
      "EvidenceCard",
      "SnapshotButton",
    ],
    groups: [
      {
        title: "The brief",
        states: [
          {
            slug: "loom/populated",
            title: "Full brief",
            when: "Three headlines, a risk and a win",
          },
          {
            slug: "loom/headline",
            title: "Headline card",
            when: "Glance-formatted, and like a fact it must cite evidence — its text is editable independently of the narrative's claims, because video wants different emphasis from text",
          },
          {
            slug: "loom/no-brief",
            title: "No brief for this week",
            when: "The narrative exists but no brief was compiled",
          },
        ],
      },
      {
        title: "Editing risk and win",
        blurb:
          "Both are single sentences, edited in place, and both are validated.",
        states: [
          {
            slug: "loom/line-editing",
            title: "Editing",
            when: "A risk or win line open for edit",
            reach: "Click the risk or win line",
          },
          {
            slug: "loom/line-empty",
            title: "Empty — blocked",
            when: "A brief with no risk is not a brief. Submit is blocked with the reason stated.",
            reach: "Clear the line and try to save",
          },
          {
            slug: "loom/line-multi",
            title: "More than one sentence — blocked",
            when: "The format is one sentence; two would not fit the glance",
            reach: "Type two sentences and try to save",
          },
          {
            slug: "loom/line-saved",
            title: "Saved",
            when: "The line is persisted",
          },
        ],
      },
    ],
  },

  {
    key: "answer-desk",
    title: "Answer Desk",
    href: "/answer-desk",
    blurb:
      "A client's question, answered from evidence Relay holds — or an honest miss. The miss is the important state: it must never look like an answer.",
    builtFrom: ["AnswerDesk", "DeskChatbox", "DeskMessages", "DeskSideBar"],
    groups: [
      {
        title: "Choosing a client",
        states: [
          {
            slug: "desk/no-client",
            title: "No client picked",
            when: "Landing state — the desk is per client",
          },
          {
            slug: "desk/client-picked",
            title: "Client picked, thread open",
            when: "One or more questions",
          },
          {
            slug: "desk/thread-empty",
            title: "No questions yet",
            when: "The client has asked nothing",
          },
        ],
      },
      {
        title: "Asking",
        states: [
          {
            slug: "desk/asking",
            title: "Composing",
            when: "The question box, with ⌘↵ to submit",
          },
          {
            slug: "desk/asking-invalid",
            title: "Empty question",
            when: "Submit blocked",
          },
          {
            slug: "desk/waiting",
            title: "Waiting on an answer",
            when: "Asked, not yet answered — this is what surfaces on Today under 'Waiting on you'",
          },
        ],
      },
      {
        title: "Answering",
        blurb:
          "The grounded/miss distinction is the single most important visual difference on this screen.",
        states: [
          {
            slug: "desk/answer-grounded",
            title: "Grounded answer",
            when: "Evidence exists. Solid border, collapsible supporting data, confidence footer.",
          },
          {
            slug: "desk/answer-evidence-open",
            title: "Supporting data expanded",
            when: "The compact evidence cards behind the answer",
            reach: "Supporting data",
          },
          {
            slug: "desk/answer-miss",
            title: "Honest miss",
            when: "Relay cannot answer from what it holds. Dashed border, help icon, NO evidence section. A miss must never be mistakable for an answer.",
          },
          {
            slug: "desk/answer-tone",
            title: "Tone toggle",
            when: "Email / Slack, then copy",
            reach: "Toggle the tone on any answer",
          },
        ],
      },
    ],
  },

  {
    key: "library",
    title: "Library",
    href: "/library",
    blurb:
      "Everything Relay has ever produced, filterable, each artifact pinned to the immutable snapshot it was written against.",
    builtFrom: [
      "LibraryBrowser",
      "EvidenceCard",
      "SnapshotButton",
      "EmptyState",
    ],
    groups: [
      {
        title: "Browsing",
        states: [
          {
            slug: "library/populated",
            title: "Results",
            when: "Artifacts exist and match the filters",
          },
          {
            slug: "library/artifact-open",
            title: "Artifact open",
            when: "The full text, with the snapshot it was written from",
            reach: "Click any result",
          },
          {
            slug: "library/types",
            title: "Three artifact types",
            when: "commentary · answer · loom brief — each needs its own mark",
          },
        ],
      },
      {
        title: "Filtering",
        blurb: "Four filters that compose: search, client, type, date range.",
        states: [
          {
            slug: "library/search",
            title: "Text search",
            when: "Filtering on artifact text",
          },
          {
            slug: "library/filtered",
            title: "Filters applied",
            when: "One or more of client / type / date range set — the active state must be visible or a user will not know why results are missing",
          },
          {
            slug: "library/no-results",
            title: "Nothing matches",
            when: "Filters exclude everything. Distinct from having no artifacts at all — the fix is different.",
          },
          {
            slug: "library/empty",
            title: "Nothing produced yet",
            when: "A brand-new install",
          },
        ],
      },
      {
        title: "Provenance",
        states: [
          {
            slug: "library/snapshot",
            title: "Snapshot viewer",
            when: "The immutable data an artifact was written against. Scrollable, capped in height.",
            reach: "The snapshot button on any open artifact",
          },
        ],
      },
    ],
  },
];

export const screenByKey = (key: string): ScreenSpec | undefined =>
  SCREENS.find((s) => s.key === key);

/** Every state across every screen, for the index's running total. */
export const stateCount = (spec: ScreenSpec): number =>
  spec.groups.reduce((n, g) => n + g.states.length, 0);

/** Birkenstock is the client whose tracker deliberately stops early, so it is the
 *  one to open when a gap or absence state is what you want to look at. */
export const GAP_CLIENT_HREF = `/clients/${BK}`;
