import Link from "next/link";
import { Bell, Copy, Filter, MoreHorizontal } from "lucide-react";
import { CatalogueHeader, Group, Slug, Spec } from "@/app/design/_ui";
import { config } from "@/lib/config";
import { clientProfiles, snapshots, timeline } from "@/lib/seed";
import { specClients, specFlags } from "@/lib/design/specimens";
import type { Answer, LoomHeadline } from "@/lib/types";

import { AnswerCard } from "@/components/relay/AnswerCard";
import { AppNav } from "@/components/relay/AppNav";
import { ClaimSpan } from "@/components/relay/ClaimSpan";
import { CommsControls } from "@/components/relay/CommsControls";
import { DueRow } from "@/components/relay/DueRow";
import { EmptyState } from "@/components/relay/EmptyState";
import { EvidenceCard } from "@/components/relay/EvidenceCard";
import { FlagCard } from "@/components/relay/FlagCard";
import { HealthDot } from "@/components/relay/HealthDot";
import { KpiList } from "@/components/relay/KpiList";
import {
  ColumnSkeleton,
  ListSkeleton,
} from "@/components/relay/LoadingSkeletons";
import { LoomHeadlineCard } from "@/components/relay/LoomHeadlineCard";
import { SensitivityChip } from "@/components/relay/SensitivityChip";
import { SensitivityEditor } from "@/components/relay/SensitivityEditor";
import { SnapshotButton } from "@/components/relay/SnapshotButton";
import { Sparkline } from "@/components/relay/Sparkline";
import { StakeholderList } from "@/components/relay/StakeholderList";
import { StatusStepper } from "@/components/relay/StatusStepper";
import { StatusTimeline, StatusWord } from "@/components/relay/StatusMark";
import { specNarratives } from "@/lib/design/specimens";
import { TimelineFeed } from "@/components/relay/TimelineFeed";
import { TokenSelect } from "@/components/relay/TokenSelect";
import { WaitingRow } from "@/components/relay/WaitingRow";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ============================================================================
   Component catalogue — every piece the app is assembled from.

   Two kinds of entry:
     · SPECIMEN — the component rendered live, with every variant it supports.
     · COMPOSITION — a full-screen assembly that needs its whole data context.
       Linked to the live route rather than faked, because a fabricated context
       would be a different screen wearing the same name.

   Ids on interactive specimens are rewritten to `dddddddd-` fixtures, so a
   stray click cannot mutate real client data.
   ========================================================================== */

/* A stand-in for the signed-in buyer. The catalogue renders outside (app), so
   there is no session to read one from. */
const NAV_DEMO_PROFILE = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "sarah@mail.com",
  name: "Sarah",
  role: "admin",
  status: "active",
} as const;

const nb = clientProfiles[0]; // Northbrook — the fully-modelled client
const snapNb = snapshots[0];
const cpo = snapNb.items.find((i) => i.id === "E3")!; // good delta, has series
const pmax = snapNb.items.find((i) => i.id === "E1")!; // neutral delta
const cpc = snapNb.items.find((i) => i.id === "E5")!; // lower-is-better, rising

const fakeId = (n: number) =>
  `dddddddd-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** Detach seed rows from their real ids so edit/delete actions hit nothing. */
const detach = <T extends { id: string; clientId: string }>(
  rows: T[],
  offset: number,
): T[] =>
  rows.map((r, i) => ({
    ...r,
    id: fakeId(offset + i),
    clientId: specClients.northbrook.id,
  }));

const factClaim = specNarratives.drafted.claims[0];
const planClaim = {
  ...factClaim,
  id: fakeId(900),
  kind: "plan" as const,
  text: "→ This week: shift roughly 15% of budget toward the objection asset group and hold everything else steady while CPCs normalise.",
  evidenceRefs: [] as never[],
};

const loomHeadline: LoomHeadline = {
  id: fakeId(910),
  briefId: fakeId(911),
  order: 1,
  text: "Cost per order held at $26.40 while we scaled spend 18%.",
  evidenceRefs: [{ snapshotId: snapNb.id, itemId: "E3" }],
};

const groundedAnswer: Answer = {
  text: "Yes — July is tracking to plan. Through Jul 12 you're at $54.6k spend against a $52k weekly pace, with cost per order at $26.40 versus the $29 line, so the extra investment is landing efficiently.",
  grounded: true,
  evidenceRefs: [
    { snapshotId: snapNb.id, itemId: "E3" },
    { snapshotId: snapNb.id, itemId: "E1" },
  ],
  confidenceLabel: "Based on Google Ads data through Sun Jul 12",
};

const missAnswer: Answer = {
  text: "I can't answer this from the data Relay holds. Q3 plan targets aren't in the client graph, so there's nothing to compare July against — worth adding as a KPI if you want this answerable.",
  grounded: false,
  evidenceRefs: [],
  confidenceLabel: "No supporting data available",
};

const COMPOSITIONS: {
  name: string;
  file: string;
  href: string;
  what: string;
}[] = [
  {
    name: "NarrativeSplitView",
    file: "components/relay/NarrativeSplitView.tsx",
    href: `/clients/${clientProfiles[0].id}/narratives/11111111-0000-4000-8000-0000000000b1`,
    what: "Draft prose on the left, evidence on the right, stitched by claim selection. The most distinctive interaction in Relay.",
  },
  {
    name: "LoomBriefView",
    file: "components/relay/LoomBriefView.tsx",
    href: `/clients/${clientProfiles[0].id}/narratives/11111111-0000-4000-8000-0000000000b1/loom`,
    what: "Recording-prep page: three headlines, one risk, one win. Risk and Win lines are editable in place.",
  },
  {
    name: "AnswerDesk",
    file: "components/relay/AnswerDesk.tsx",
    href: "/answer-desk",
    what: "Client-question thread with grounded answers and honest misses.",
  },
  {
    name: "WorkspaceTabs",
    file: "components/relay/WorkspaceTabs.tsx",
    href: `/clients/${clientProfiles[0].id}`,
    what: "The client workspace shell: Timeline / Numbers / Drafts / Profile.",
  },
  {
    name: "NumbersTab",
    file: "components/relay/NumbersTab.tsx",
    href: `/clients/${clientProfiles[0].id}`,
    what: "Daily rows as a scannable table with per-metric sparklines. Inside WorkspaceTabs → Numbers.",
  },
  {
    name: "LibraryBrowser",
    file: "components/relay/LibraryBrowser.tsx",
    href: "/library",
    what: "Every artifact Relay has produced, filterable, each pinned to its snapshot.",
  },
];

export default function ComponentsPage() {
  return (
    <>
      <CatalogueHeader title="Components" count="2 of 3">
        Twenty-nine Relay components and twelve shadcn primitives. Every Relay
        component is rendered live here with all its variants — except six
        full-screen compositions, which are linked to their real routes because
        a fabricated data context would be a different screen wearing the same
        name.
      </CatalogueHeader>

      {/* ================================================================ */}
      <Group
        id="evidence"
        title="The evidence system"
        blurb="Relay's core argument: every factual sentence is traceable to a number. These four components are that argument. Redesign them together or not at all."
      >
        <Spec
          id="EvidenceCard"
          title="EvidenceCard — 4 states"
          when="The atom of evidence. Linked = the claim currently selected cites this. Dimmed = a different claim is selected."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {(["default", "linked", "dimmed"] as const).map((state) => (
              <div key={state} className="flex flex-col gap-2">
                <Slug id={`EvidenceCard/${state}`} />
                <EvidenceCard item={cpo} state={state} asOf={snapNb.asOf} />
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <Slug id="EvidenceCard/compact" />
              <EvidenceCard item={pmax} compact asOf={snapNb.asOf} />
            </div>
          </div>
        </Spec>

        <Spec
          id="ClaimSpan"
          title="ClaimSpan — fact vs plan × 4 states"
          when="A fact carries the dotted underline because evidence exists. A plan has no underline because it cites nothing — that asymmetry is enforced in the type system, the schema, and a database CHECK."
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Slug id="ClaimSpan/fact" />
              <p className="font-narrative text-18 text-ink">
                <ClaimSpan
                  claim={factClaim}
                  selected={false}
                  highlighted={false}
                  dimmed={false}
                />
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Slug id="ClaimSpan/fact-selected" />
              <p className="font-narrative text-18 text-ink">
                <ClaimSpan
                  claim={factClaim}
                  selected
                  highlighted={false}
                  dimmed={false}
                />
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Slug id="ClaimSpan/fact-dimmed" />
              <p className="font-narrative text-18 text-ink">
                <ClaimSpan
                  claim={factClaim}
                  selected={false}
                  highlighted={false}
                  dimmed
                />
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Slug id="ClaimSpan/plan" />
              <p className="font-narrative text-18 text-ink">
                <ClaimSpan
                  claim={planClaim}
                  selected={false}
                  highlighted={false}
                  dimmed={false}
                />
              </p>
            </div>
          </div>
        </Spec>

        <Spec
          id="Sparkline"
          title="Sparkline — hand-drawn SVG, no charting library"
          when="Seven points, no axes. `invert` flips the good/bad reading for lower-is-better metrics."
        >
          <div className="flex flex-wrap items-center gap-8">
            <span className="flex flex-col gap-2">
              <Slug id="Sparkline/default" />
              <Sparkline series={cpo.series ?? []} />
            </span>
            <span className="flex flex-col gap-2">
              <Slug id="Sparkline/accent" />
              <Sparkline series={cpo.series ?? []} className="text-verdigris" />
            </span>
            <span className="flex flex-col gap-2">
              <Slug id="Sparkline/invert" />
              <Sparkline series={cpc.series ?? []} invert />
            </span>
          </div>
        </Spec>

        <Spec
          id="SnapshotButton"
          title="SnapshotButton"
          when="Opens the immutable snapshot a claim was written against. Click it — the dialog is part of the specimen."
        >
          <SnapshotButton snapshot={snapNb} />
        </Spec>
      </Group>

      {/* ================================================================ */}
      <Group
        id="status"
        title="Status & health"
        blurb="Small, high-frequency indicators. They appear on nearly every screen, so their weight sets the tone of the whole app."
      >
        <Spec
          id="StatusWord"
          title="StatusWord — the list-row form (RECOMMENDED)"
          when="Replaces the stepper in every list row. The row's button already says what to do next, so a three-node diagram beside it repeats itself once per row. Colour follows the palette's roles: grey nothing-yet, blue at-the-send-step, green done."
        >
          <div className="flex flex-wrap items-center gap-6">
            {(["drafted", "reviewed", "sent"] as const).map((st) => (
              <span key={st} className="flex flex-col gap-2">
                <Slug id={`StatusWord/${st}`} />
                <StatusWord status={st} />
              </span>
            ))}
          </div>
        </Spec>

        <Spec
          id="StatusTimeline"
          title="StatusTimeline — the narrative-page form (RECOMMENDED)"
          when="Strictly more than the stepper carried: it says WHEN, not just whether, and a missing timestamp is itself the 'not yet'. It also survives the lifecycle growing — Back to draft means a narrative can go reviewed → drafted → reviewed, which three fixed nodes cannot depict."
        >
          <div className="flex flex-col gap-4">
            {(
              [
                ["drafted", specNarratives.drafted],
                ["reviewed", specNarratives.reviewed],
                ["sent", specNarratives.sent],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="flex flex-col gap-2">
                <Slug id={`StatusTimeline/${label}`} />
                <StatusTimeline narrative={n} />
              </div>
            ))}
          </div>
        </Spec>

        <Spec
          id="StatusStepper"
          title="StatusStepper — the outgoing form, for comparison"
          when="Still built, no longer used anywhere. Kept here only so the two can be compared before the designer settles it. Delete once that call is made."
        >
          <div className="flex flex-col gap-6">
            {(["drafted", "reviewed", "sent"] as const).map((s) => (
              <div key={s} className="flex flex-col gap-2">
                <Slug id={`StatusStepper/${s}`} />
                <StatusStepper status={s} />
              </div>
            ))}
            <Separator />
            <div className="flex flex-wrap gap-6">
              {(["drafted", "reviewed", "sent"] as const).map((s) => (
                <span key={s} className="flex flex-col gap-2">
                  <Slug id={`StatusStepper/${s}-compact`} />
                  <StatusStepper status={s} compact />
                </span>
              ))}
            </div>
          </div>
        </Spec>

        <Spec
          id="HealthDot"
          title="HealthDot — green / amber / red"
          when="Account sync health. Amber and red must be distinguishable without colour alone."
        >
          <div className="flex flex-wrap gap-8">
            {(["green", "amber", "red"] as const).map((h) => (
              <span key={h} className="flex flex-col gap-2">
                <Slug id={`HealthDot/${h}`} />
                <HealthDot health={h} label={h} />
              </span>
            ))}
          </div>
        </Spec>

        <Spec
          id="SensitivityChip"
          title="SensitivityChip — 4 types"
          when="A standing client rule the draft must respect. Type drives the icon."
        >
          <div className="flex flex-wrap gap-2">
            {nb.sensitivities.map((s) => (
              <SensitivityChip key={s.id} sensitivity={s} />
            ))}
            {clientProfiles[1].sensitivities.map((s) => (
              <SensitivityChip key={s.id} sensitivity={s} />
            ))}
          </div>
        </Spec>
      </Group>

      {/* ================================================================ */}
      <Group
        id="cards"
        title="Cards & rows"
        blurb="The repeating units that make up Today and the client workspace."
      >
        <Spec
          id="FlagCard"
          title="FlagCard — open / dismissed / resolved"
          when="Three lifecycle states with different affordances. See /design/states/today for the reason-capture interaction."
          onPaper
        >
          <div className="flex flex-col gap-4">
            <FlagCard
              flag={specFlags.withDraft}
              clientName="Birkenstock"
              clientLogo={config.clientLogos.Birkenstock}
            />
            <FlagCard
              flag={specFlags.dismissed}
              clientName="Switchup"
              clientLogo={config.clientLogos.Switchup}
            />
            <FlagCard
              flag={specFlags.resolved}
              clientName="Northbrook"
              clientLogo={config.clientLogos.Northbrook}
            />
          </div>
        </Spec>

        <Spec
          id="DueRow"
          title="DueRow — 3 pipeline states"
          when="One row of Today's Due this week. Action weight follows status."
          onPaper
        >
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            <DueRow
              narrative={specNarratives.drafted}
              client={{
                id: specClients.northbrook.id,
                name: "Northbrook",
                cadence: { primary: "weekly", anchorDay: "mon" },
                channel: "whatsapp",
              }}
            />
            <DueRow
              narrative={specNarratives.reviewed}
              client={{
                id: specClients.birkenstock.id,
                name: "Birkenstock",
                cadence: { primary: "weekly-lite", secondary: "monthly" },
                channel: "email",
              }}
            />
            <DueRow
              narrative={specNarratives.sent}
              client={{
                id: specClients.switchup.id,
                name: "Switchup",
                cadence: { primary: "weekly" },
                channel: "email",
              }}
            />
          </ul>
        </Spec>

        <Spec
          id="WaitingRow"
          title="WaitingRow"
          when="An unanswered client question. Age never truncates — it is the reason the row exists."
          onPaper
        >
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            <WaitingRow
              clientId={specClients.switchup.id}
              clientName="Switchup"
              question="Can you confirm July is still tracking to the Q3 plan we set?"
              age="2 hours"
            />
            <WaitingRow
              clientId={specClients.northbrook.id}
              clientName="Northbrook"
              question="Why did cost per order move on Thursday? The founder asked and I want to give a precise answer rather than a directional one."
              age="19 hours"
            />
          </ul>
        </Spec>

        <Spec
          id="LoomHeadlineCard"
          title="LoomHeadlineCard"
          when="One glance-formatted line for a Loom recording. Like a fact, it must cite evidence — but its text is editable independently of the narrative."
          onPaper
        >
          <LoomHeadlineCard
            headline={loomHeadline}
            items={snapNb.items}
            clientId={specClients.northbrook.id}
            narrativeId={specNarratives.drafted.id}
          />
        </Spec>

        <Spec
          id="AnswerCard"
          title="AnswerCard — grounded vs honest miss"
          when="A miss must never look like an answer: dashed border, help icon, no evidence section. This is the single most important visual distinction in the Answer Desk."
          onPaper
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Slug id="AnswerCard/grounded" />
              <AnswerCard answer={groundedAnswer} items={snapNb.items} />
            </div>
            <div className="flex flex-col gap-2">
              <Slug id="AnswerCard/miss" />
              <AnswerCard answer={missAnswer} items={[]} />
            </div>
          </div>
        </Spec>

        <Spec
          id="TimelineFeed"
          title="TimelineFeed"
          when="What Relay has said to this client over time, each entry pinned to the snapshot it was written against."
          onPaper
        >
          <TimelineFeed
            entries={timeline}
            snapshots={{ [snapNb.id]: snapNb }}
          />
        </Spec>
      </Group>

      {/* ================================================================ */}
      <Group
        id="editors"
        title="Client-graph editors"
        blurb="The Profile tab. All four write through server actions; here they point at fixture ids, so a submit fails loudly and changes nothing."
      >
        <Spec
          id="KpiList"
          title="KpiList — read, add, edit, delete"
          when="Targets and polarity per client. Polarity decides whether a rise is good news."
          note="Click Add KPI or a row's edit control to see the form. Submitting fails — the fixture client does not exist."
        >
          <KpiList
            kpis={detach(nb.kpis, 100)}
            clientId={specClients.northbrook.id}
          />
        </Spec>

        <Spec
          id="SensitivityEditor"
          title="SensitivityEditor"
          when="Standing rules about how to talk to this client. Four types."
          note="Interactive; submits fail against the fixture id."
        >
          <SensitivityEditor
            sensitivities={detach(nb.sensitivities, 200)}
            clientId={specClients.northbrook.id}
          />
        </Spec>

        <Spec
          id="StakeholderList"
          title="StakeholderList"
          when="Who receives what. `gets` controls the depth of the version they see."
          note="Interactive; submits fail against the fixture id."
        >
          <StakeholderList
            stakeholders={detach(nb.stakeholders, 300)}
            clientId={specClients.northbrook.id}
          />
        </Spec>

        <Spec
          id="CommsControls"
          title="CommsControls"
          when="Cadence and channel. Changing cadence changes which drafts Relay expects to exist."
          note="Interactive; submits fail against the fixture id."
        >
          <CommsControls
            clientId={specClients.northbrook.id}
            cadence={nb.cadence}
            channel={nb.channel}
          />
        </Spec>

        <Spec
          id="TokenSelect"
          title="TokenSelect"
          when="A native select styled with tokens. Used for every small enum in the editors above — chosen over shadcn's Select because a native control is the simplest accessible thing that works at 375px."
        >
          <div className="flex flex-wrap gap-3">
            <TokenSelect defaultValue="lower" aria-label="Polarity">
              <option value="lower">lower is better</option>
              <option value="higher">higher is better</option>
              <option value="on">on target</option>
            </TokenSelect>
            <TokenSelect defaultValue="weekly" aria-label="Cadence">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="weekly-lite">Weekly — lite</option>
              <option value="monthly">Monthly</option>
            </TokenSelect>
          </div>
        </Spec>
      </Group>

      {/* ================================================================ */}
      <Group
        id="shell"
        title="Shell, empty & loading"
        blurb="Chrome and the two things every async screen needs."
      >
        <Spec
          id="AppNav"
          title="AppNav — sidebar and bottom bar"
          when="Four routes, one nav list, two renderings. The bottom bar is the mobile form below md."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Slug id="AppNav/sidebar" />
              {/* The frame's own height is the viewport; capped here so the
                  specimen does not run the length of the catalogue. */}
              <div className="flex h-96 overflow-hidden rounded-lg border border-line">
                <AppNav profile={NAV_DEMO_PROFILE} isAdmin />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Slug id="AppNav/collapsed" />
              <p className="font-ui text-12 text-ink-soft">
                One component, two widths — 230 and 55. Use the chevron in the
                specimen; the choice is remembered per browser.
              </p>
              <Slug id="AppNav/bottom" />
              <p className="font-ui text-12 text-ink-soft">
                Renders fixed to the viewport bottom below <code>md</code>.
                Narrow this window to see it.
              </p>
            </div>
          </div>
        </Spec>

        <Spec
          id="EmptyState"
          title="EmptyState — with and without an action"
          when="1.5px dashed outline, one line of explanation, at most one CTA. Never a wall of text."
          onPaper
        >
          <div className="flex flex-col gap-4">
            <EmptyState
              title="No clients connected yet"
              action={<Button size="sm">Connect a client</Button>}
            >
              Connect a client to see your week take shape.
            </EmptyState>
            <EmptyState title="Nothing due">
              No outstanding drafts and nothing scheduled for this week.
            </EmptyState>
          </div>
        </Spec>

        <Spec
          id="LoadingSkeletons"
          title="ListSkeleton & ColumnSkeleton"
          when="Route-level loading.tsx for every async screen. Shapes must match the real content or the swap flickers."
          onPaper
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Slug id="ListSkeleton" />
              <ListSkeleton rows={3} />
            </div>
            <div className="flex flex-col gap-2">
              <Slug id="ColumnSkeleton" />
              <ColumnSkeleton rows={3} />
            </div>
          </div>
        </Spec>
      </Group>

      {/* ================================================================ */}
      <Group
        id="compositions"
        title="Compositions — linked, not faked"
        blurb="Six screen-level assemblies. Each needs a full data context; a fabricated one would be a different screen wearing the same name, so these link to the real thing."
      >
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          {COMPOSITIONS.map((c) => (
            <div key={c.name} className="flex flex-col gap-1 px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex flex-wrap items-baseline gap-3">
                  <Slug id={c.name} />
                  <span className="font-mono text-12 text-ink-soft">
                    {c.file}
                  </span>
                </span>
                <Link
                  href={c.href}
                  className="font-ui text-13 text-verdigris hover:underline"
                >
                  Open live →
                </Link>
              </div>
              <p className="max-w-column font-ui text-13 text-ink-soft">
                {c.what}
              </p>
            </div>
          ))}
        </div>
      </Group>

      {/* ================================================================ */}
      <Group
        id="primitives"
        title="shadcn primitives"
        blurb="Twelve. None owns a colour — every one reads the Relay aliases listed on the Tokens page. Restyling these is a token edit."
      >
        <Spec
          id="ui/button"
          title="Button — 6 variants × 4 sizes"
          when="`default` is the primary action and resolves to verdigris. Only one primary per surface."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {(
                [
                  "default",
                  "secondary",
                  "outline",
                  "ghost",
                  "destructive",
                  "link",
                ] as const
              ).map((v) => (
                <Button key={v} variant={v}>
                  {v}
                </Button>
              ))}
            </div>
            <Separator />
            <div className="flex flex-wrap items-center gap-3">
              {(["xs", "sm", "default", "lg"] as const).map((s) => (
                <Button key={s} size={s}>
                  size {s}
                </Button>
              ))}
              <Button size="icon" aria-label="More">
                <MoreHorizontal />
              </Button>
              <Button size="icon-sm" variant="outline" aria-label="Copy">
                <Copy />
              </Button>
            </div>
            <Separator />
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>disabled</Button>
              <Button variant="outline" disabled>
                disabled outline
              </Button>
              <Button size="sm">
                <Filter /> with icon
              </Button>
            </div>
          </div>
        </Spec>

        <Spec
          id="ui/badge"
          title="Badge — 6 variants"
          when="Used for source chips and counts. Never for actions."
        >
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                "default",
                "secondary",
                "outline",
                "ghost",
                "destructive",
                "link",
              ] as const
            ).map((v) => (
              <Badge key={v} variant={v}>
                {v}
              </Badge>
            ))}
          </div>
        </Spec>

        <Spec
          id="ui/input"
          title="Input & Textarea"
          when="Both re-based onto rounded-md and border-line. The invalid state uses the negative token."
        >
          <div className="flex max-w-column flex-col gap-3">
            <Input placeholder="Metric label" aria-label="Metric label" />
            <Input
              defaultValue="26.40"
              inputMode="decimal"
              aria-label="Value"
            />
            <Input
              defaultValue="not a number"
              aria-invalid
              aria-label="Invalid example"
            />
            <Input disabled placeholder="Disabled" aria-label="Disabled" />
            <Textarea
              placeholder="Why are you dismissing this? (required)"
              aria-label="Reason"
              className="min-h-16"
            />
          </div>
        </Spec>

        <Spec
          id="ui/tabs"
          title="Tabs"
          when="The client workspace shell. Four tabs is the maximum before it needs a different pattern."
        >
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="numbers">Numbers</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              <p className="pt-4 font-ui text-13 text-ink-soft">
                Timeline panel content.
              </p>
            </TabsContent>
            <TabsContent value="numbers">
              <p className="pt-4 font-ui text-13 text-ink-soft">
                Numbers panel content.
              </p>
            </TabsContent>
            <TabsContent value="drafts">
              <p className="pt-4 font-ui text-13 text-ink-soft">
                Drafts panel content.
              </p>
            </TabsContent>
            <TabsContent value="profile">
              <p className="pt-4 font-ui text-13 text-ink-soft">
                Profile panel content.
              </p>
            </TabsContent>
          </Tabs>
        </Spec>

        <Spec
          id="ui/overlays"
          title="Dialog, Sheet, DropdownMenu, Tooltip"
          when="All four are interactive — click and hover to see them. Dialog height caps at --spacing-dialog-cap and scrolls inside."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Open Dialog
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Snapshot — Jul 6–12</DialogTitle>
                  <DialogDescription>
                    Immutable. This is what the draft was written against.
                  </DialogDescription>
                </DialogHeader>
                <EvidenceCard item={cpo} compact asOf={snapNb.asOf} />
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  Open Sheet
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    The mobile form of a side panel.
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Open Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Copy for WhatsApp</DropdownMenuItem>
                <DropdownMenuItem>Copy for email</DropdownMenuItem>
                <DropdownMenuItem>Back to draft</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Notifications"
                >
                  <Bell />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hover target</TooltipContent>
            </Tooltip>
          </div>
        </Spec>

        <Spec
          id="ui/separator-skeleton"
          title="Separator & Skeleton"
          when="Separator resolves to border-line. Skeleton resolves to the paper token, so it never looks like content."
        >
          <div className="flex flex-col gap-4">
            <Separator />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </Spec>

        <Spec
          id="ui/sonner"
          title="Toaster (sonner)"
          when="Every confirmation in Relay is a toast. Mounted once in the root layout — trigger one from any interactive specimen above."
        >
          <p className="max-w-column font-ui text-13 text-ink-soft">
            Not renderable in isolation. Click Confirm on{" "}
            <Link
              href="/design/states/today#digest/mixed"
              className="text-verdigris hover:underline"
            >
              digest/mixed
            </Link>{" "}
            to see one.
          </p>
        </Spec>
      </Group>
    </>
  );
}
