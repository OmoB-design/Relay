"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Check, ChevronDown, CircleAlert, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { config, formatCurrency } from "@/lib/config";
import type { DailyMetrics, DailyRow, ClientProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/relay/EmptyState";
import {
  confirmDailyRowAction,
  recompileAction,
} from "@/app/(app)/today/daily-actions";

/* The morning band (Phase 7.5a) — the first thing on Today, because it's the
   most time-critical thing in a buyer's morning.

   One row per client: yesterday's numbers, source-stamped, staged and waiting.
   Confirming IS reviewing. Editing captures a reason. A client Relay couldn't
   reach says so plainly and never renders an absent figure as zero.          */

const dc = config.copy.daily;

type MetricKey = keyof DailyMetrics;

const METRICS: { key: MetricKey; label: string; kind: "money" | "count" | "ratio" | "percent" }[] = [
  { key: "spend", label: "Spend", kind: "money" },
  { key: "sales", label: "Sales", kind: "count" },
  { key: "revenue", label: "Revenue", kind: "money" },
  { key: "roas", label: "ROAS", kind: "ratio" },
  { key: "cpa_cpo", label: "CPA/CPO", kind: "money" },
  { key: "nc_roas", label: "NC ROAS", kind: "ratio" },
  { key: "ncac", label: "NCAC", kind: "money" },
  { key: "nvp", label: "NVP", kind: "percent" },
];

function display(kind: string, value: number | undefined): string {
  if (value === undefined) return "—";
  if (kind === "money") return formatCurrency(value);
  if (kind === "ratio") return `${value.toFixed(2)}x`;
  if (kind === "percent") return `${Math.round(value * 100) / 100}%`;
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

/** Three distinct absences, because each needs a different response from the
 *  buyer. Rendering them identically was a real gap: at 08:00 "we haven't
 *  looked yet" and "the tracker row is missing" call for opposite actions. */
export type DigestProblem = {
  kind: "notCompiled" | "absent" | "stale";
  message: string;
};

export type DigestEntry = {
  client: Pick<ClientProfile, "id" | "name" | "sourceOfTruth" | "dailyToClient">;
  row?: DailyRow;
  problem?: DigestProblem;
};

function ClientRow({ entry }: { entry: DigestEntry }) {
  const { client, row, problem } = entry;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A client with no usable row — stated plainly, never rendered as a zero.
  if (!row) {
    const notCompiled = problem?.kind === "notCompiled";
    return (
      <li className="flex items-start gap-3 border-hair border-dashed border-line px-4 py-3">
        {notCompiled ? (
          <Clock size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-soft" />
        ) : (
          <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-flag" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-display text-16 text-ink">{client.name}</span>
          <span className="block font-ui text-13 text-ink-soft">
            {problem?.message}
          </span>
          {/* "Relay hasn't looked" is fixed by re-running; "the row isn't in
              the tracker" is fixed in the sheet. Say which. */}
          {problem?.kind === "absent" && (
            <span className="mt-1 block font-ui text-12 text-ink-soft">
              {dc.goToTracker}
            </span>
          )}
        </span>
      </li>
    );
  }

  const confirmed = row.status === "confirmed";
  const sourceChip =
    row.source === "Tracker" && row.sourceOfTruth
      ? `Tracker · ${row.sourceOfTruth}`
      : row.source;

  function beginEdit() {
    setDraft(
      Object.fromEntries(
        METRICS.map((m) => [m.key, row!.metrics[m.key] !== undefined ? String(row!.metrics[m.key]) : ""]),
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
            const raw = draft[m.key];
            const n = raw === undefined || raw.trim() === "" ? undefined : Number(raw);
            return [m.key, Number.isFinite(n) ? n : undefined];
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
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} all metrics for ${client.name}`}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={cn("shrink-0 text-ink-soft transition-transform", open && "rotate-180")}
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-16 text-ink">{client.name}</span>
              <span className="inline-flex items-center rounded-full border border-line bg-paper px-2 py-0.5 font-ui text-12 text-ink-soft">
                {sourceChip}
              </span>
              {confirmed && (
                <span className="inline-flex items-center gap-1 font-ui text-12 text-verdigris">
                  <Check size={12} aria-hidden="true" /> {dc.confirmed}
                </span>
              )}
            </span>
            {/* The two numbers a buyer scans first. */}
            <span className="block font-ui text-13 text-ink-soft">
              Spend {display("money", row.metrics.spend)} · Sales{" "}
              {display("count", row.metrics.sales)} · CPA/CPO{" "}
              {display("money", row.metrics.cpa_cpo)}
            </span>
          </span>
        </button>

        {!confirmed && !editing && (
          <Button size="sm" onClick={() => submit(false)} disabled={pending}>
            {pending ? dc.working : dc.confirm}
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3 pl-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {METRICS.map((m) => {
              const unavailable = row.unavailable[m.key];
              return (
                <div key={m.key}>
                  <dt className="font-ui text-12 uppercase tracking-wide text-ink-soft">
                    {m.label}
                  </dt>
                  <dd>
                    {editing ? (
                      <Input
                        inputMode="decimal"
                        value={draft[m.key] ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [m.key]: e.target.value }))
                        }
                        aria-label={m.label}
                        className="h-8"
                      />
                    ) : unavailable ? (
                      <span
                        className="font-ui text-13 text-ink-soft"
                        title={unavailable}
                      >
                        n/a
                      </span>
                    ) : (
                      <span className="font-display text-16 text-ink">
                        {display(m.kind, row.metrics[m.key])}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>

          {/* Why a metric is missing, said out loud rather than left blank. */}
          {Object.entries(row.unavailable).length > 0 && !editing && (
            <p className="font-ui text-12 text-ink-soft">
              {Object.values(row.unavailable)[0]}
            </p>
          )}

          <p className="font-ui text-12 text-ink-soft">
            {client.dailyToClient ? dc.goesToClient : dc.blockedFromClient}
          </p>

          {row.edited && row.overrideReason && (
            <p className="font-ui text-12 text-ink-soft">
              Edited on confirm — {row.overrideReason}
            </p>
          )}

          {editing && (
            <div className="flex flex-col gap-2">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={dc.overridePlaceholder}
                aria-label="Reason for changing the numbers"
                aria-invalid={!reasonValid}
                className="min-h-16 bg-surface"
              />
              {!reasonValid && (
                <p className="font-ui text-12 text-negative">{dc.overrideRequired}</p>
              )}
              {error && <p className="font-ui text-12 text-negative">{error}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => submit(true)}
                  disabled={pending || !reasonValid}
                >
                  {pending ? dc.working : dc.confirm}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  {config.copy.actions.cancel}
                </Button>
              </div>
            </div>
          )}

          {!editing && !confirmed && (
            <div>
              <Button size="sm" variant="outline" onClick={beginEdit}>
                {dc.edit}
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
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
  const waiting = entries.filter((e) => e.row && e.row.status === "staged").length;

  function recompile() {
    if (cooling || pending) return;
    startTransition(async () => {
      await recompileAction();
      setCooldownUntil(Date.now() + config.daily.recompileCooldownSeconds * 1000);
      setNowTick(Date.now());
      toast("Compiled");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-ui text-13 uppercase tracking-wide text-ink-soft">
          {dc.bandTitle}
          {date && `, ${format(parseISO(date), "EEE MMM d")}`} — {entries.length}{" "}
          {entries.length === 1 ? "client" : "clients"}
          {compiledAt &&
            ` · ${dc.compiledAt} ${format(parseISO(compiledAt), "HH:mm")}`}
        </h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={recompile}
          disabled={pending || cooling}
          title={cooling ? dc.cooldown : undefined}
        >
          <RefreshCw
            size={14}
            aria-hidden="true"
            className={cn(pending && "animate-spin")}
          />{" "}
          {pending ? dc.working : cooling ? dc.cooldown : dc.recompile}
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState title={dc.noRows}>
          Run the compile to stage yesterday&apos;s numbers for every client.
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {entries.map((entry) => (
              <ClientRow key={entry.client.id} entry={entry} />
            ))}
          </ul>
          {waiting === 0 && (
            <p className="font-ui text-13 text-ink-soft">{dc.allConfirmed}</p>
          )}
        </>
      )}
    </section>
  );
}
