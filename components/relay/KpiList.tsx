"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { config } from "@/lib/config";
import { MetricKeySchema, type Kpi } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FieldSelect } from "@/components/relay/FieldSelect";
import {
  EditField,
  EditInput,
  ItemCard,
  ItemEditShell,
  ProfileFooter,
  ProfileRowBody,
  ProfileRowEdit,
  RemoveButton,
} from "@/components/relay/ProfileCard";
import {
  addKpiAction,
  deleteKpiAction,
  updateKpiAction,
} from "@/app/(client)/clients/[clientId]/actions";

/* KPIs in the client's language — the individual-metric component set
   499:3562. Each metric is its OWN white card; editing swaps that card for
   the wash container in place: the metric's name written on the wash, one
   white card of Label / Target / Polarity, then Remove | Cancel · Save.

   On existing metrics, maps-to stays read-only (remapping a live KPI is a
   data-model operation); new KPIs pick their internal metric and format on
   create — the set does not draw the add state, so those two extra fields
   wrap onto a second row of the same field card. */

const POLARITY_LABEL: Record<Kpi["polarity"], string> = {
  higher_is_better: "Higher is better",
  lower_is_better: "Lower is better",
  // "On target", as the polarity dropdown writes it (node 499:3945) — the
  // tolerance already prints beside the target, so the ±band said it twice.
  on_target: "On target",
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
    <ItemEditShell
      label={initial?.label}
      footer={
        <>
          {initial ? (
            <RemoveButton
              onClick={remove}
              disabled={pending}
              label={`Remove ${initial.label}`}
            />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5">
            <Button size="fig" variant="ghost" onClick={onDone}>
              {config.copy.actions.cancel}
            </Button>
            <Button
              size="fig"
              onClick={save}
              disabled={pending || !targetValid || !labelValid}
            >
              {config.copy.actions.save}
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-wrap items-start gap-y-2 px-2">
        <EditField label="Label">
          <EditInput
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="cost per order"
            invalid={!labelValid}
          />
        </EditField>
        <EditField label="Target">
          {/* Red marks EMPTY, not not-yet-numeric: the field goes blue the
              moment there is anything in it (the modal set's language), and
              the hint plus the disabled Save carry the numeric rule. */}
          <EditInput
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            invalid={target.trim() === ""}
          />
        </EditField>
        <EditField label="Polarity">
          <FieldSelect
            value={polarity}
            onChange={setPolarity}
            ariaLabel="Polarity"
            compactOptions
            wideOptions
            options={(
              Object.entries(POLARITY_LABEL) as [Kpi["polarity"], string][]
            ).map(([value, text]) => ({ value, label: text }))}
          />
        </EditField>
        {!initial && (
          <>
            <EditField label="Maps to (internal metric)">
              <FieldSelect
                value={mapsTo}
                onChange={setMapsTo}
                ariaLabel="Maps to internal metric"
                compactOptions
                options={METRIC_KEYS.map((k) => ({ value: k, label: k }))}
              />
            </EditField>
            <EditField label="Format">
              <FieldSelect
                value={format}
                onChange={setFormat}
                ariaLabel="Format"
                compactOptions
                options={(
                  Object.entries(FORMAT_LABEL) as [Kpi["format"], string][]
                ).map(([value, text]) => ({ value, label: text }))}
              />
            </EditField>
          </>
        )}
      </div>
      {!targetValid && (
        <p className="px-4 pt-2 font-geist text-fig-caption-2 text-red-700">
          Target must be a number.
        </p>
      )}
    </ItemEditShell>
  );
}

export function KpiList({ kpis, clientId }: { kpis: Kpi[]; clientId: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      {/* FLUSH, per the triage on 422:6551: items at consecutive y with zero
          gap and zero horizontal inset — the seams are abutting hairlines. */}
      <ul className="flex w-full flex-col">
        {kpis.map((kpi) => (
          <li key={kpi.id} className="w-full">
            {editingId === kpi.id ? (
              <KpiForm
                clientId={clientId}
                initial={kpi}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <ItemCard>
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
              </ItemCard>
            )}
          </li>
        ))}
        {adding && (
          <li className="w-full">
            <KpiForm clientId={clientId} onDone={() => setAdding(false)} />
          </li>
        )}
      </ul>
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
