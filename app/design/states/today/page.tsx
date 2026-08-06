import { CatalogueHeader, Group, Slug, Spec } from "@/app/design/_ui";
import { config } from "@/lib/config";
import {
  specClients,
  specEntries,
  specFlagItems,
  specFlags,
  specNarratives,
  specWaiting,
} from "@/lib/design/specimens";
import {
  DailyDigestBand,
  type DigestEntry,
} from "@/components/relay/DailyDigestBand";
import {
  DueEmpty,
  DueList,
  DueRow,
  type DueClient,
} from "@/components/relay/DueRow";
import { FlagCard } from "@/components/relay/FlagCard";
import { TodayFlagList } from "@/components/relay/TodayFlagList";
import { WaitingList, WaitingRow } from "@/components/relay/WaitingRow";
import { SectionHeading } from "@/components/relay/SectionHeading";
import { ClientsGlyph, WaitingGlyph } from "@/components/relay/NavIcons";
import { EmptyPanel } from "@/components/relay/EmptyPanel";
import { TodaySkeleton } from "@/components/relay/LoadingSkeletons";
import { PageHeader } from "@/components/relay/PageHeader";
import { HealthCard } from "@/components/relay/HealthCard";
import { clientProfiles } from "@/lib/seed";

/* ============================================================================
   Today — the complete state catalogue.

   Every state Today can be in, each in its own frame with a stable slug. These
   are the frames to design. A screen is not covered until every slug below has
   a Figma counterpart; a design that only handles `today/populated` will break
   the first morning the tracker is late.

   Specimens render the REAL components against fixtures from
   lib/design/specimens.ts. Nothing here reads or writes production data.
   ========================================================================== */

const t = config.copy.today;

/* Figma draws the health meter all-green; the seed's real mix has one amber, so
   both are shown. Green here means every account healthy. */
const healthySpecimen = clientProfiles.map((c) => ({
  ...c,
  accounts: c.accounts.map((a) => ({ ...a, health: "green" as const })),
}));

/** Today's section heading, replicated so a frame shows its own context. */
function Section({
  title,
  glyph,
  children,
}: {
  title: string;
  glyph?: React.ReactNode;
  children: React.ReactNode;
}) {
  /* The real heading, not a catalogue lookalike — a specimen that draws its own
     chrome stops being evidence the moment the shared one changes. */
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <h2>
        <SectionHeading title={title} glyph={glyph} />
      </h2>
      {children}
    </section>
  );
}

/** The catalogue shows the same marks the app does, including the one client
 *  deliberately left without a logo so the initials fallback stays visible. */
const withLogos = (entries: DigestEntry[]): DigestEntry[] =>
  entries.map((e) => ({ ...e, logo: config.clientLogos[e.client.name] }));

const dueClients: Record<string, DueClient> = {
  northbrook: {
    id: specClients.northbrook.id,
    name: "Northbrook",
    cadence: { primary: "weekly", anchorDay: "mon" },
    channel: "whatsapp",
  },
  birkenstock: {
    id: specClients.birkenstock.id,
    name: "Birkenstock",
    cadence: { primary: "weekly-lite", secondary: "monthly" },
    channel: "email",
  },
  switchup: {
    id: specClients.switchup.id,
    name: "Switchup",
    cadence: { primary: "weekly" },
    channel: "email",
  },
};

const SLUGS = [
  ["today/page-header", "today/pilot-clock", "today/health"],
  [
    "today/loaded",
    "today/quiet",
    "today/first-run-buyer",
    "today/loading",
  ],
  [
    "digest/mixed",
    "digest/staged",
    "digest/confirmed",
    "digest/edited",
    "digest/partial",
    "digest/absences",
    "digest/not-compiled",
    "digest/absent",
    "digest/stale",
    "digest/all-confirmed",
    "digest/empty",
  ],
  [
    "flags/open-list",
    "flags/with-draft",
    "flags/no-draft",
    "flags/dismissing",
    "flags/dismissed",
    "flags/resolved",
    "flags/none",
  ],
  ["waiting/list", "waiting/none"],
  ["due/all", "due/drafted", "due/reviewed", "due/sent", "due/empty"],
];

export default function TodayStatesPage() {
  return (
    <>
      <CatalogueHeader title="Today — every state" count="3 of 3">
        Thirty-two frames. Today has four sections and each has its own
        absence and progress states, so the real matrix is much wider than the
        happy path. Design every slug listed here; annotate each Figma frame
        with its slug and the mapping back to code is unambiguous.
      </CatalogueHeader>

      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="font-ui text-13 uppercase tracking-wide text-ink-soft">
          Coverage checklist
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SLUGS.flat().map((s) => (
            <a key={s} href={`#${s}`}>
              <Slug id={s} />
            </a>
          ))}
        </div>
        <p className="mt-4 max-w-column font-ui text-12 text-ink-soft">
          Frames marked with an amber note contain an interactive state you have
          to click into — the component owns that state internally, so the
          catalogue shows the control rather than faking the result.
        </p>
      </div>

      {/* ---------------------------------------------------------------- */}
      <Group
        id="page"
        title="Page level"
        blurb="The frame around everything — the masthead, the health line, and the pinned-clock notice."
      >
        <Spec
          id="today/page-header"
          title="Page header"
          when="Always. Mark, date right-aligned, greeting, orientation line."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <PageHeader
              date="Monday, July 13"
              greeting="Hey Angel."
              subline={t.greeting}
            />
          </div>
        </Spec>

        <Spec
          id="today/health"
          title="Health metric — the portfolio in one line"
          when="Sits under the greeting once clients exist. One segment per client, tinted by that client's worst account health."
          onPaper
        >
          <div className="mx-auto flex max-w-sheet flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Slug id="today/health/all-green" />
              <PageHeader
                date="Monday, July 13"
                greeting="Hey Angel."
                subline={t.greeting}
              >
                <HealthCard clients={healthySpecimen} />
              </PageHeader>
            </div>
            <div className="flex flex-col gap-2">
              <Slug id="today/health/mixed" />
              <p className="font-ui text-12 text-ink-soft">
                The seed&apos;s real mix — Birkenstock is amber. Figma only draws
                the
                all-green case, so the headline ladder below it is inferred: any
                red client outranks any number of green ones.
              </p>
              <PageHeader
                date="Monday, July 13"
                greeting="Hey Angel."
                subline={t.greeting}
              >
                <HealthCard clients={clientProfiles} />
              </PageHeader>
            </div>
          </div>
        </Spec>

        <Spec
          id="today/pilot-clock"
          title="Demo clock pinned"
          when="RELAY_PILOT_NOW is set — a frozen date must never look like a bug"
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <PageHeader
              date="Monday, July 13"
              greeting="Hey Angel."
              subline={t.greeting}
              notice={
                <p className="font-geist text-fig-caption-2 text-yellow-700">
                  Demo clock — pinned to Monday, July 13. Unset RELAY_PILOT_NOW
                  for the real date.
                </p>
              }
            />
          </div>
        </Spec>

      </Group>

      {/* ---------------------------------------------------------------- */}
      <Group
        id="assemblies"
        title="Page assemblies — the whole of Today, per state"
        blurb="The full page as one composition, for designing the entire view rather than a section. Everything inside is the real components with specimen data; only the arrangement is provisional until the full-page frame lands."
      >
        <Spec
          id="today/loaded"
          title="The working morning — everything populated"
          when="The state to design first: mixed digest, questions waiting, open flags, all three due statuses. This is what a buyer sees most Mondays."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <div className="mb-8">
              <PageHeader
                date="Monday, July 13"
                greeting="Hey Angel."
                subline={t.greeting}
              >
                <HealthCard clients={clientProfiles} />
              </PageHeader>
            </div>
            <div className="flex flex-col gap-10">
              <DailyDigestBand entries={withLogos(specEntries.mixed)} />
              <Section
                title={t.waitingTitle}
                glyph={<WaitingGlyph className="size-nav-icon" />}
              >
                <WaitingList>
                  {specWaiting.map((w, i) => (
                    <WaitingRow
                      key={w.question}
                      clientId={specClients.switchup.id}
                      clientName={w.clientName}
                      question={w.question}
                      age={w.age}
                      last={i === specWaiting.length - 1}
                    />
                  ))}
                </WaitingList>
              </Section>
              <Section title={t.flagsTitle}>
                <TodayFlagList items={specFlagItems.all} />
              </Section>
              <Section title={t.dueTitle}>
                <DueList>
                  <DueRow
                    narrative={specNarratives.drafted}
                    client={dueClients.northbrook}
                    logo={config.clientLogos[dueClients.northbrook.name]}
                  />
                  <DueRow
                    narrative={specNarratives.reviewed}
                    client={dueClients.birkenstock}
                    logo={config.clientLogos[dueClients.birkenstock.name]}
                  />
                  <DueRow
                    narrative={specNarratives.sent}
                    client={dueClients.switchup}
                    logo={config.clientLogos[dueClients.switchup.name]}
                  />
                </DueList>
              </Section>
            </div>
          </div>
        </Spec>

        <Spec
          id="today/quiet"
          title="The quiet morning — everything done, nothing burning"
          when="All rows confirmed, no flags, no questions waiting, nothing due. The ONLY frame that shows the page with two sections ABSENT — Flags and Waiting collapse entirely rather than rendering empty, so this is where the layout proves it holds together without them."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <div className="mb-8">
              <PageHeader
                date="Monday, July 13"
                greeting="Hey Angel."
                subline={t.greeting}
              >
                <HealthCard clients={healthySpecimen} />
              </PageHeader>
            </div>
            <div className="flex flex-col gap-10">
              <DailyDigestBand entries={withLogos(specEntries.allConfirmed)} />
              {/* No Waiting section. No Flags section. That is the state. */}
              <Section title={t.dueTitle}>
                <DueEmpty />
              </Section>
            </div>
          </div>
        </Spec>

        <Spec
          id="today/first-run-buyer"
          title="First run, as a BUYER — nothing assigned (node 357:1074)"
          when="Covers two situations that look identical from here: no clients exist, or clients exist but none are this buyer's. Either way their next move is to ask, so there is no button — a CTA a buyer cannot use is worse than none."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <PageHeader
              date="Monday, July 13"
              greeting="Hey Angel."
              subline={t.firstRunSubline}
              variant="first-run"
            >
              <EmptyPanel
                title={config.copy.auth.noClients}
                glyph={
                  <ClientsGlyph className="size-nav-icon text-icon-explainer" />
                }
              >
                {config.copy.auth.noClientsBody}
              </EmptyPanel>
            </PageHeader>
          </div>
        </Spec>

        <Spec
          id="today/loading"
          title="Loading — the shimmer"
          when="What /today renders while the data loads. Every bar is sized from the component it stands in for, so nothing jumps when content lands. Tune the sweep at /design/skeletons."
          onPaper
        >
          <TodaySkeleton />
        </Spec>
      </Group>

      {/* ---------------------------------------------------------------- */}
      <Group
        id="digest"
        title="Yesterday's numbers — the digest band"
        blurb="The most time-critical thing on the page: one row per client, staged overnight, waiting for a human. Confirming IS reviewing."
      >
        <Spec
          id="digest/mixed"
          title="A real Monday — four clients, mixed statuses"
          when="The state to design first. Two waiting, two done."
          note="Click a client row to expand all eight metrics. Click Edit on a staged row to reach digest/editing."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.mixed)} />
          </div>
        </Spec>

        <Spec
          id="digest/staged"
          title="Staged — waiting for confirmation"
          when="The compile ran; nobody has looked yet. Confirm is primary."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.staged)} />
          </div>
        </Spec>

        <Spec
          id="digest/confirmed"
          title="Confirmed"
          when="A human accepted the numbers as-is. No action remains."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.confirmed)} />
          </div>
        </Spec>

        <Spec
          id="digest/edited"
          title="Confirmed with corrections"
          when="The buyer changed a number. The reason is part of the permanent record."
          note="Expand the row to see the override reason line."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.edited)} />
          </div>
        </Spec>

        <Spec
          id="digest/partial"
          title="Some metrics unavailable"
          when="The source returned nothing for a metric. Shows n/a with a reason on hover — never a stand-in zero."
          note="Expand to see the three n/a cells and the reason line beneath."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.partial)} />
          </div>
        </Spec>

        <Spec
          id="digest/absences"
          title="All three absences side by side"
          when="The comparison that matters most — three different problems needing three different responses."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.allProblems)} />
          </div>
        </Spec>

        <Spec
          id="digest/not-compiled"
          title="Not compiled yet"
          when="Relay hasn't looked. Fixed by re-running the compile → clock icon, ink-soft."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.notCompiled)} />
          </div>
        </Spec>

        <Spec
          id="digest/absent"
          title="Tracker row missing"
          when="Relay looked and the row wasn't there. Fixed in the sheet, not in Relay → alert icon, flag colour, plus a pointer to the tracker."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.absent)} />
          </div>
        </Spec>

        <Spec
          id="digest/stale"
          title="Stale — newest row is an older day"
          when="Something upstream stopped. Reported as absent, never as zero."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.stale)} />
          </div>
        </Spec>

        <Spec
          id="digest/all-confirmed"
          title="All confirmed — the morning is done"
          when="Nothing left waiting. The closing line is the reward."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.allConfirmed)} />
          </div>
        </Spec>

        <Spec
          id="digest/empty"
          title="No rows at all"
          when="Clients exist but no compile has ever run."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DailyDigestBand entries={withLogos(specEntries.empty)} />
          </div>
        </Spec>
      </Group>

      {/* ---------------------------------------------------------------- */}
      <Group
        id="flags"
        title="Flags"
        blurb="Proactive detection. Dismissal always captures a reason; the engine retracts anything whose condition stops holding, and can re-open it later."
      >
        <Spec
          id="flags/open-list"
          title="The open queue"
          when="Open flags only — resolved and dismissed never appear here."
          note="Live wiring: Dismiss opens reason capture; Edit & send copies the draft note. Actions point at fixture ids and will fail harmlessly."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <Section title={t.flagsTitle}>
              <TodayFlagList items={specFlagItems.all} />
            </Section>
          </div>
        </Spec>

        <Spec
          id="flags/with-draft"
          title="Open, with a pre-drafted heads-up"
          when="A draft note exists → both Dismiss and Edit & send."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <FlagCard flag={specFlags.withDraft} clientName="Birkenstock" />
          </div>
        </Spec>

        <Spec
          id="flags/no-draft"
          title="Open, no draft note"
          when="No note to send → Dismiss only. The button never leads nowhere."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <FlagCard flag={specFlags.noDraft} clientName="Northbrook" />
          </div>
        </Spec>

        <Spec
          id="flags/dismissing"
          title="Dismiss — reason capture"
          when="Dismissal is an audit event. An empty reason blocks the submit."
          note="Click Dismiss on the card below to open the textarea, then try to confirm with it empty to see the validation state."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <TodayFlagList items={specFlagItems.one} />
          </div>
        </Spec>

        <Spec
          id="flags/dismissed"
          title="Dismissed"
          when="A human decided this doesn't matter. The engine never overrides it."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <FlagCard flag={specFlags.dismissed} clientName="Switchup" />
          </div>
        </Spec>

        <Spec
          id="flags/resolved"
          title="Resolved — engine-retracted"
          when="The condition stopped holding. Leaves the queue on its own; re-opens if it recurs."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <FlagCard flag={specFlags.resolved} clientName="Northbrook" />
          </div>
        </Spec>

        <Spec
          id="flags/none"
          title="No open flags"
          when="The section collapses entirely — the absence of urgency is itself information. There is deliberately no empty state here."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <p className="border-hair border-dashed border-line px-4 py-6 text-center font-ui text-13 text-ink-soft">
              Nothing renders at all — no heading, no card, no gap. The dashed
              outline is this catalogue marking the absence; the product shows
              literally nothing.
            </p>
          </div>
        </Spec>
      </Group>

      {/* ---------------------------------------------------------------- */}
      <Group
        id="waiting"
        title="Waiting on you"
        blurb="Unanswered client questions. Like Flags, this section disappears when empty rather than showing a zero-state."
      >
        <Spec
          id="waiting/list"
          title="Questions waiting"
          when="One or more unanswered threads. Age is the point of the row."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <Section
              title={t.waitingTitle}
              glyph={<WaitingGlyph className="size-nav-icon" />}
            >
              <WaitingList>
                {specWaiting.map((w, i) => (
                  <WaitingRow
                    key={w.question}
                    clientId={specClients.switchup.id}
                    clientName={w.clientName}
                    question={w.question}
                    age={w.age}
                    last={i === specWaiting.length - 1}
                  />
                ))}
              </WaitingList>
            </Section>
          </div>
        </Spec>

        <Spec
          id="waiting/none"
          title="Nothing waiting"
          when="Section collapses entirely."
          onPaper
        >
          <p className="border-hair border-dashed border-line px-4 py-6 text-center font-ui text-13 text-ink-soft">
            Nothing renders at all — no heading, no card, no gap. The dashed
            outline is this catalogue marking the absence; the product shows
            literally nothing.
          </p>
        </Spec>
      </Group>

      {/* ---------------------------------------------------------------- */}
      <Group
        id="due"
        title="Due this week"
        blurb="Outstanding work of any age, plus anything sent in the last 7 days. Oldest first within status, capped at 25."
      >
        <Spec
          id="due/all"
          title="All three pipeline states together"
          when="The usual case. Each row's action is determined by its status."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <Section title={t.dueTitle}>
              <DueList>
                <DueRow
                  narrative={specNarratives.drafted}
                  client={dueClients.northbrook}
                  logo={config.clientLogos[dueClients.northbrook.name]}
                />
                <DueRow
                  narrative={specNarratives.reviewed}
                  client={dueClients.birkenstock}
                  logo={config.clientLogos[dueClients.birkenstock.name]}
                />
                <DueRow
                  narrative={specNarratives.sent}
                  client={dueClients.switchup}
                  logo={config.clientLogos[dueClients.switchup.name]}
                />
              </DueList>
            </Section>
          </div>
        </Spec>

        <Spec
          id="due/drafted"
          title="Drafted"
          when="Relay wrote it; nobody has read it. Action: Review draft (primary)."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DueList>
              <DueRow
                narrative={specNarratives.drafted}
                client={dueClients.northbrook}
                  logo={config.clientLogos[dueClients.northbrook.name]}
              />
            </DueList>
          </div>
        </Spec>

        <Spec
          id="due/reviewed"
          title="Reviewed"
          when="A human approved it; it hasn't gone out. Action: Send (primary)."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DueList>
              <DueRow
                narrative={specNarratives.reviewed}
                client={dueClients.birkenstock}
                  logo={config.clientLogos[dueClients.birkenstock.name]}
              />
            </DueList>
          </div>
        </Spec>

        <Spec
          id="due/sent"
          title="Sent"
          when="Done. Action drops to secondary weight: View sent (outline)."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <DueList>
              <DueRow
                narrative={specNarratives.sent}
                client={dueClients.switchup}
                  logo={config.clientLogos[dueClients.switchup.name]}
              />
            </DueList>
          </div>
        </Spec>

        <Spec
          id="due/empty"
          title="All caught up"
          when="No outstanding drafts and nothing sent recently. This section DOES get a zero-state, unlike Flags and Waiting."
          onPaper
        >
          <div className="mx-auto max-w-sheet">
            <Section title={t.dueTitle}>
              <DueEmpty />
            </Section>
          </div>
        </Spec>
      </Group>
    </>
  );
}
