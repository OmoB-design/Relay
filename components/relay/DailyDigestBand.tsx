"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  ChevronRight,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { formatMetric, metricLabel } from "@/lib/metrics";
import type { DailyMetrics, DailyRow, ClientProfile } from "@/lib/types";
import { ClientAvatar } from "@/components/relay/ClientAvatar";
import { DashedOutline } from "@/components/relay/DashedOutline";
import { EmptyPanel } from "@/components/relay/EmptyPanel";
import { Dot, SourceChip } from "@/components/relay/SourceChip";
import { MetricField } from "@/components/relay/MetricField";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmDailyRowAction,
  recompileAction,
} from "@/app/(app)/today/daily-actions";

/* The morning band — Figma component set "Digest" (node 309:17116), 20 variants
   across two axes: the row's state (staged · confirmed · edit · partial ·
   not-compiled · absent · stale) and how far it is open (closed · open ·
   edit numbers · selected · active), plus band-level mixed / all-confirmed / empty.

   MEASURED FROM node 309:17100, not approximated:
     band      flex-col · gap 16
     card      one 0.7px hairline + shadow › p 4
     panel     #fbfbfb · 0.7px · radius 14 · pt 4 pb 12 · gap 16
     header    border-b 0.7px · pb 12 · px 8 · gap 8
     grid      2 rows of 4 · gap-x 16 · gap-y 8
     note+CTA  px 8 · gap 10 · LEFT-aligned, INSIDE the panel

   That last line is why the open row had dead space beneath it: Edit numbers was
   in a right-aligned footer band of its own. Figma keeps it in the panel, directly
   under the delivery note. Only the edit form's Cancel/Confirm pair gets a footer.

   THE CONFIRM AFFORDANCE is in the row header and stays there whether the row is
   collapsed or expanded, so a buyer who opens a row to read it can accept it
   without going through the edit form.                                        */

const dc = config.copy.daily;

type MetricKey = keyof DailyMetrics;

/** The tracker's eight, in the frames' order. Labels and formatting come from
 *  lib/metrics.ts so the band, the flags engine and the ingest all agree. */
const METRICS: MetricKey[] = [
  "spend",
  "sales",
  "revenue",
  "roas",
  "cpa_cpo",
  "nc_roas",
  "ncac",
  "nvp",
];

export type DigestProblem = {
  kind: "notCompiled" | "absent" | "stale";
  message: string;
};

export type DigestEntry = {
  client: Pick<
    ClientProfile,
    "id" | "name" | "sourceOfTruth" | "dailyToClient"
  >;
  row?: DailyRow;
  problem?: DigestProblem;
  /** Path under /public. Absent → the avatar falls back to initials. */
  logo?: string;
  /** May the reader change this row? A view-only buyer sees the numbers and is
   *  offered nothing to press — RLS would refuse the write anyway, and a button
   *  that fails reads as a broken app rather than as a permission. */
  canEdit?: boolean;
};

/* ONE shell. Figma nests three at radius 18, but concentric hairlines at the same
   radius stack into banding rather than depth — the frames read as a single edge,
   so that is what this draws. */
const CARD =
  "flex flex-col overflow-hidden rounded-18 border-fig border-border bg-surface-primary shadow-card";
/* The panel fill is bound to Surface/Dashboard in node 365:3662, where the
   earlier digest frame carried a raw #fbfbfb. A variable beats a hex. */
const PANEL =
  "flex flex-col overflow-hidden rounded-14 border-fig border-border bg-surface-dashboard";

const display = (key: MetricKey, value: number | undefined): string =>
  value === undefined ? "—" : formatMetric(key, value);

/** Status chips on an absent row — the frames name the problem before the
 *  sentence explains it. */
const PROBLEM_CHIP: Record<DigestProblem["kind"], string> = {
  notCompiled: dc.chipNotCompiled,
  absent: dc.chipAbsent,
  stale: dc.chipStale,
};

function ClientRow({ entry }: { entry: DigestEntry }) {
  const { client, row, problem, logo, canEdit = true } = entry;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /* No usable row. Three different problems needing three different responses,
     so they get three different treatments — at 08:00 "we haven't looked yet"
     and "the tracker row is missing" call for opposite actions. */
  if (!row || problem) {
    const kind = problem?.kind ?? "notCompiled";
    return (
      /* A DASHED shell (nodes 309:17112 absent, 309:17110 stale) — an outline
         around a hole, which is what both of these rows are. The stroke is
         PAINTED rather than bordered; see DashedOutline for why 0.7px dashed
         cannot be a CSS border. The panel inside stays solid. */
      <div className={cn(CARD, "relative h-digest-row border-0")}>
        <DashedOutline />
        <div className="flex flex-1 flex-col p-1">
          {/* The well fills what the fixed height leaves, so the slack under the
              row is what remains rather than a padding that fights the height. */}
          <div className={cn(PANEL, "flex-1 gap-4 px-2 pt-1")}>
            <div className="flex items-center gap-2">
              <ClientAvatar name={client.name} logo={logo} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2.5">
                  <span className="font-geist text-fig-body fig-w450 text-heading-01">
                    {client.name}
                  </span>
                  {/* No border and no icon — the wash carries it. The frame
                      covers absent and stale; notCompiled is not a warning
                      about the DATA but about Relay not having looked yet, so
                      it keeps the neutral grey and only borrows the shape. */}
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-1 font-geist text-fig-caption-2",
                      kind === "notCompiled"
                        ? "bg-surface-foreground-01 text-heading-05"
                        : "bg-yellow-50 text-yellow-700",
                    )}
                  >
                    {PROBLEM_CHIP[kind]}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5 font-geist text-fig-caption-1 text-heading-06">
                  <span>{problem?.message}</span>
                  {/* Absent alone gets the instruction. Node 309:17110 draws
                      stale as a single line — its message already names both
                      dates, which says what to look at without being told. */}
                  {kind === "absent" && (
                    <>
                      <Dot />
                      <span>{dc.goToTracker}</span>
                    </>
                  )}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const confirmed = row.status === "confirmed";

  function beginEdit() {
    setDraft(
      Object.fromEntries(
        METRICS.map((m) => [
          m,
          row!.metrics[m] !== undefined ? String(row!.metrics[m]) : "",
        ]),
      ),
    );
    setEditing(true);
    setOpen(true);
  }

  function submit(withEdits: boolean) {
    setError(null);
    const metrics: DailyMetrics | undefined = withEdits
      ? (Object.fromEntries(
          METRICS.map((m) => {
            const raw = draft[m];
            const n =
              raw === undefined || raw.trim() === "" ? undefined : Number(raw);
            return [m, Number.isFinite(n) ? n : undefined];
          }),
        ) as DailyMetrics)
      : undefined;

    startTransition(async () => {
      const result = await confirmDailyRowAction({
        rowId: row!.id,
        metrics,
        overrideReason: withEdits ? reason.trim() : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      toast(dc.confirmedToast);
      router.refresh();
    });
  }

  const reasonValid = reason.trim().length > 0;

  return (
    /* 63px closed, whether the row ends in Confirm or a chevron. Open, it has to
       grow — the metric grid and the override form live below the header. */
    <div className={cn(CARD, !open && "h-digest-row")}>
      <div className="flex flex-1 flex-col p-1">
        <div className={cn(PANEL, "flex-1 gap-4 pt-1", open && "pb-3")}>
          {/* Header — identity, source, the two numbers a buyer scans first,
                  and the one action that advances the row. */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 px-2",
              open && "divider-b border-border pb-3",
            )}
          >
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`${open ? "Hide" : "Show"} all metrics for ${client.name}`}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-8 text-left outline-offset-4"
            >
              <ClientAvatar name={client.name} logo={logo} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2.5">
                  <span className="font-geist text-fig-body fig-w450 text-heading-01">
                    {client.name}
                  </span>
                  <SourceChip
                    source={row.source}
                    sourceOfTruth={row.sourceOfTruth}
                  />
                  {confirmed && (
                    <span className="inline-flex items-center rounded-full border-fig border-green-50 bg-green-50 px-1.5 py-1 font-geist text-fig-caption-2 text-green-500">
                      {dc.confirmed}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 font-geist text-fig-caption-1 text-heading-06">
                  <span>
                    {metricLabel("spend")} {display("spend", row.metrics.spend)}
                  </span>
                  <Dot />
                  <span>
                    {metricLabel("sales")} {display("sales", row.metrics.sales)}
                  </span>
                  <Dot />
                  <span>
                    {metricLabel("cpa_cpo")}{" "}
                    {display("cpa_cpo", row.metrics.cpa_cpo)}
                  </span>
                </span>
              </span>
            </button>

            {/* A view-only buyer gets the chevron, never Confirm. RLS refuses
                their write regardless; offering the button would teach them the
                app is broken rather than that they are read-only. */}
            {canEdit && !confirmed && !editing ? (
              <Button
                size="fig"
                variant={pending ? "working" : "secondary"}
                onClick={() => submit(false)}
                disabled={pending}
              >
                {pending ? dc.working : dc.confirm}
              </Button>
            ) : (
              !editing && (
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 text-caption-1 transition-transform",
                    open && "rotate-90",
                  )}
                />
              )
            )}
          </div>

          {open && (
            <>
              {/* Eight metrics, two rows of four. */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {METRICS.map((m) => (
                  <MetricField
                    key={m}
                    label={metricLabel(m).toUpperCase()}
                    value={display(m, row.metrics[m])}
                    unavailable={row.unavailable[m]}
                    editing={editing}
                    draft={draft[m]}
                    onChange={(next) => setDraft((d) => ({ ...d, [m]: next }))}
                  />
                ))}
              </dl>

              {/* Note and its one action, left-aligned inside the panel. */}
              <div className="flex flex-col items-start gap-2.5 px-2">
                {/* Why a metric is missing, said out loud rather than left blank. */}
                {Object.entries(row.unavailable).length > 0 && !editing && (
                  <p className="font-geist text-fig-caption-2 text-heading-06">
                    {Object.values(row.unavailable)[0]}
                  </p>
                )}

                <p className="font-geist text-fig-caption-2 text-heading-06">
                  {client.dailyToClient
                    ? dc.goesToClient
                    : dc.blockedFromClient}
                </p>

                {row.edited && row.overrideReason && !editing && (
                  <p className="font-geist text-fig-caption-2 text-caption-1">
                    {dc.editedPrefix} {row.overrideReason}
                  </p>
                )}

                {editing ? (
                  <div className="flex w-full flex-col gap-1.5">
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={dc.overridePlaceholder}
                      aria-label="Reason for changing the numbers"
                      aria-invalid={!reasonValid}
                      className={cn(
                        "min-h-16 rounded-12 bg-surface-primary p-2 font-geist text-fig-caption-1 text-heading-02 placeholder:text-caption-1 md:text-fig-caption-1",
                        !reasonValid && "border-red-600 field-invalid",
                      )}
                    />
                    {!reasonValid && (
                      <p className="font-geist text-fig-caption-2 text-red-700">
                        {dc.overrideRequired}
                      </p>
                    )}
                    {error && (
                      <p className="font-geist text-fig-caption-2 text-red-700">
                        {error}
                      </p>
                    )}
                  </div>
                ) : (
                  canEdit &&
                  !confirmed && (
                    <Button size="fig" onClick={beginEdit}>
                      {dc.edit}
                    </Button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Only the edit form gets a footer band; the read state does not. */}
      {open && editing && (
        <div className="flex items-center justify-end gap-1.5 p-2.5">
          <Button size="fig" variant="ghost" onClick={() => setEditing(false)}>
            {config.copy.actions.cancel}
          </Button>
          <Button
            size="fig"
            variant={pending ? "working" : "default"}
            onClick={() => submit(true)}
            disabled={pending || !reasonValid}
          >
            {pending ? dc.working : dc.confirm}
          </Button>
        </div>
      )}
    </div>
  );
}

export function DailyDigestBand({ entries }: { entries: DigestEntry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Each run hits the Sheets API once per client. A short cooldown stops
  // impatient re-clicking from burning quota for no new information.
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (cooldownUntil === 0) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);
  const cooling = nowTick < cooldownUntil;

  const date = entries.find((e) => e.row)?.row?.date;
  const compiledAt = entries.find((e) => e.row)?.row?.compiledAt;
  const usable = entries.filter((e) => e.row && !e.problem).length;
  const waiting = entries.filter(
    (e) => e.row && !e.problem && e.row.status === "staged",
  ).length;
  // "All confirmed" is a reward for finishing, not the default when there is
  // nothing to finish. With every client absent, zero staged rows is a problem
  // report — saying the morning is done would be false.
  const allDone = usable > 0 && waiting === 0;

  function recompile() {
    if (cooling || pending) return;
    startTransition(async () => {
      await recompileAction();
      setCooldownUntil(
        Date.now() + config.daily.recompileCooldownSeconds * 1000,
      );
      setNowTick(Date.now());
      toast(dc.confirmedToast);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 font-geist text-fig-body fig-medium text-heading-06">
          <span>
            {dc.bandTitle}
            {date && `, ${format(parseISO(date), "EEE MMM d")}`} -{" "}
            {entries.length} {entries.length === 1 ? "Client" : "Clients"}
          </span>
          {compiledAt && (
            <>
              <Dot size="md" />
              <span>
                {dc.compiledAt} {format(parseISO(compiledAt), "HH:mm")}
              </span>
            </>
          )}
        </h2>
        <Button
          size="fig-compile"
          variant="ghost"
          onClick={recompile}
          disabled={pending || cooling}
          title={cooling ? dc.cooldown : undefined}
        >
          <RefreshCw
            aria-hidden="true"
            className={cn("size-3", pending && "animate-spin")}
          />{" "}
          {pending ? dc.working : cooling ? dc.cooldown : dc.recompile}
        </Button>
      </div>

      {entries.length === 0 ? (
        /* The same panel the due row and first-run use. Three empty states on
           one page that each drew their own box was three boxes; this is one. */
        <EmptyPanel
          title={dc.noRows}
          glyph={
            <Inbox size={14} aria-hidden="true" className="text-icon-explainer" />
          }
        >
          {dc.noRowsBody}
        </EmptyPanel>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* A hairline between cards as well as the 8px gap (node 365:3662).
              The cards are white on white, so the gap alone does not separate
              them — the rule is what makes them read as a list. */}
          <ul className="flex flex-col gap-2">
            {entries.map((entry, i) => (
              <li key={entry.client.id} className="flex flex-col gap-2">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="h-0 w-full divider-b border-border"
                  />
                )}
                <ClientRow entry={entry} />
              </li>
            ))}
          </ul>
          {allDone && (
            <p className="font-geist text-fig-caption-2 text-heading-06">
              {dc.allConfirmed}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
