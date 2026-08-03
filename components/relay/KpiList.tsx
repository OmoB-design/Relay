"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { config } from "@/lib/config";
import { MetricKeySchema, type Kpi } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TokenSelect } from "@/components/relay/TokenSelect";
import {
  addKpiAction,
  deleteKpiAction,
  updateKpiAction,
} from "@/app/(app)/clients/[clientId]/actions";

/* KPI rows in the client's language (design.md §4.2). Inline row editing plus
   add/remove. On existing rows, maps-to stays read-only (remapping a live KPI
   is a data-model operation); new KPIs pick their internal metric on create. */

const POLARITY_LABEL: Record<Kpi["polarity"], string> = {
  higher_is_better: "Higher is better",
  lower_is_better: "Lower is better",
  on_target: "On target (±band)",
};

const FORMAT_LABEL: Record<Kpi["format"], string> = {
  currency: "Currency",
  count: "Count",
  ratio: "Ratio",
  percent: "Percent",
};

const METRIC_KEYS = MetricKeySchema.options;

function KpiForm({
  clientId,
  initial,
  onDone,
}: {
  clientId: string;
  initial?: Kpi; // present = edit, absent = add
  onDone: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [target, setTarget] = useState(initial ? String(initial.target) : "");
  const [polarity, setPolarity] = useState<Kpi["polarity"]>(
    initial?.polarity ?? "lower_is_better",
  );
  const [mapsTo, setMapsTo] = useState<Kpi["mapsTo"]>(
    initial?.mapsTo ?? "cpa_cpo",
  );
  const [format, setFormat] = useState<Kpi["format"]>(
    initial?.format ?? "currency",
  );
  const [pending, startTransition] = useTransition();

  const targetNumber = Number(target);
  const targetValid = target.trim() !== "" && Number.isFinite(targetNumber);
  const labelValid = label.trim().length > 0;

  function save() {
    startTransition(async () => {
      if (initial) {
        await updateKpiAction({
          clientId,
          kpiId: initial.id,
          label: label.trim(),
          target: targetNumber,
          polarity,
        });
      } else {
        await addKpiAction({
          clientId,
          label: label.trim(),
          mapsTo,
          target: targetNumber,
          polarity,
          format,
        });
      }
      onDone();
      toast(config.copy.actions.saved);
    });
  }

  function remove() {
    if (!initial) return;
    startTransition(async () => {
      await deleteKpiAction(clientId, initial.id);
      onDone();
      toast("KPI removed");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="font-ui text-12 text-ink-soft">Label</span>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="cost per order"
            aria-invalid={!labelValid}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-ui text-12 text-ink-soft">Target</span>
          <Input
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-invalid={!targetValid}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-ui text-12 text-ink-soft">Polarity</span>
          <TokenSelect
            value={polarity}
            onChange={(e) => setPolarity(e.target.value as Kpi["polarity"])}
          >
            {Object.entries(POLARITY_LABEL).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </TokenSelect>
        </label>
        {!initial && (
          <>
            <label className="flex flex-col gap-1">
              <span className="font-ui text-12 text-ink-soft">
                Maps to (internal metric)
              </span>
              <TokenSelect
                value={mapsTo}
                onChange={(e) => setMapsTo(e.target.value as Kpi["mapsTo"])}
              >
                {METRIC_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </TokenSelect>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-ui text-12 text-ink-soft">Format</span>
              <TokenSelect
                value={format}
                onChange={(e) => setFormat(e.target.value as Kpi["format"])}
              >
                {Object.entries(FORMAT_LABEL).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </TokenSelect>
            </label>
          </>
        )}
      </div>
      {!targetValid && (
        <p className="font-ui text-12 text-negative">Target must be a number.</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={save}
            disabled={pending || !targetValid || !labelValid}
          >
            {config.copy.actions.save}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDone}>
            {config.copy.actions.cancel}
          </Button>
        </div>
        {initial && (
          <Button
            size="sm"
            variant="ghost"
            className="text-negative"
            onClick={remove}
            disabled={pending}
          >
            {config.copy.actions.remove}
          </Button>
        )}
      </div>
    </div>
  );
}

export function KpiList({ kpis, clientId }: { kpis: Kpi[]; clientId: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <ul className="divide-y divide-line">
      {kpis.map((kpi) => (
        <li key={kpi.id} className="px-4 py-3">
          {editingId === kpi.id ? (
            <KpiForm
              clientId={clientId}
              initial={kpi}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-ui text-14 text-ink">
                  {kpi.label}
                </span>
                <span className="block font-ui text-12 text-ink-soft">
                  maps to {kpi.mapsTo} · target {kpi.target}
                  {kpi.tolerancePct ? ` ±${kpi.tolerancePct}%` : ""} ·{" "}
                  {POLARITY_LABEL[kpi.polarity]}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingId(kpi.id)}
                aria-label={`Edit ${kpi.label}`}
              >
                <Pencil size={14} aria-hidden="true" />
                {config.copy.actions.edit}
              </Button>
            </div>
          )}
        </li>
      ))}
      <li className="px-4 py-3">
        {adding ? (
          <KpiForm clientId={clientId} onDone={() => setAdding(false)} />
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus size={14} aria-hidden="true" /> Add KPI
          </Button>
        )}
      </li>
    </ul>
  );
}
