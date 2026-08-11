"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { config } from "@/lib/config";
import { MetricKeySchema, type Kpi } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TokenSelect } from "@/components/relay/TokenSelect";
import {
  ProfileFooter,
  ProfileRow,
  ProfileRowBody,
  ProfileRowEdit,
  ProfileRows,
} from "@/components/relay/ProfileCard";
import {
  addKpiAction,
  deleteKpiAction,
  updateKpiAction,
} from "@/app/(app)/clients/[clientId]/actions";

/* KPI rows in the client's language — restyled to node 422:6552's rows: 59px,
   13px label over "Maps to X · target N · polarity" with 3px dots, a pencil
   Edit on the right, Add KPI as the card's footer.

   Inline row editing survives the restyle. The frame does not draw the edit
   state, so the form keeps the field layer's styling and the row grows. On
   existing rows, maps-to stays read-only (remapping a live KPI is a data-model
   operation); new KPIs pick their internal metric on create. */

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
          <span className="font-geist text-fig-caption-2 text-heading-06">Label</span>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="cost per order"
            aria-invalid={!labelValid}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-geist text-fig-caption-2 text-heading-06">Target</span>
          <Input
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-invalid={!targetValid}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-geist text-fig-caption-2 text-heading-06">Polarity</span>
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
              <span className="font-geist text-fig-caption-2 text-heading-06">
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
              <span className="font-geist text-fig-caption-2 text-heading-06">Format</span>
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
        <p className="font-geist text-fig-caption-2 text-red-700">Target must be a number.</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            size="fig"
            onClick={save}
            disabled={pending || !targetValid || !labelValid}
          >
            {config.copy.actions.save}
          </Button>
          <Button size="fig" variant="ghost" onClick={onDone}>
            {config.copy.actions.cancel}
          </Button>
        </div>
        {initial && (
          <Button
            size="fig"
            variant="ghost"
            className="text-red-700"
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
    <>
      <ProfileRows>
        {kpis.map((kpi, i) => (
          <ProfileRow key={kpi.id} first={i === 0} editing={editingId === kpi.id}>
            {editingId === kpi.id ? (
              <KpiForm
                clientId={clientId}
                initial={kpi}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div className="flex h-full items-center justify-between gap-2 px-2">
                <ProfileRowBody
                  title={kpi.label}
                  meta={[
                    `Maps to ${kpi.mapsTo}`,
                    `target ${kpi.target}${kpi.tolerancePct ? ` ±${kpi.tolerancePct}%` : ""}`,
                    POLARITY_LABEL[kpi.polarity],
                  ]}
                />
                <ProfileRowEdit
                  onClick={() => setEditingId(kpi.id)}
                  label={`Edit ${kpi.label}`}
                />
              </div>
            )}
          </ProfileRow>
        ))}
        {adding && (
          <ProfileRow first={kpis.length === 0} editing>
            <KpiForm clientId={clientId} onDone={() => setAdding(false)} />
          </ProfileRow>
        )}
      </ProfileRows>
      <ProfileFooter>
        <Button
          size="fig"
          variant="muted"
          className="flex-1"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          Add KPI
        </Button>
      </ProfileFooter>
    </>
  );
}
