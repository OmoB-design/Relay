"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { config } from "@/lib/config";
import type { Stakeholder } from "@/lib/types";
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
  deleteStakeholderAction,
  saveStakeholderAction,
} from "@/app/(app)/clients/[clientId]/actions";

/* Stakeholders — the individual component set 499:3921: each one its own
   white card, the name over "role · gets X version"; editing swaps the card
   in place for the wash container with Name / Role / Gets on one row and
   Remove | Cancel · Save under it. Unlike the KPI set, no label is written on
   the wash — the fields open flush at the top. */

type Gets = Stakeholder["gets"];
const GETS = Object.keys(config.copy.stakeholderGetsLabel) as Gets[];

function StakeholderForm({
  clientId,
  initial,
  onDone,
}: {
  clientId: string;
  initial?: Stakeholder;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [gets, setGets] = useState<Gets>(initial?.gets ?? "short");
  const [pending, startTransition] = useTransition();

  const valid = name.trim().length > 0 && role.trim().length > 0;

  function save() {
    startTransition(async () => {
      await saveStakeholderAction({
        clientId,
        id: initial?.id,
        name: name.trim(),
        role: role.trim(),
        gets,
      });
      onDone();
      toast(config.copy.actions.saved);
    });
  }

  function remove() {
    if (!initial) return;
    startTransition(async () => {
      await deleteStakeholderAction(clientId, initial.id);
      onDone();
      toast("Stakeholder removed");
    });
  }

  return (
    <ItemEditShell
      footer={
        <>
          {initial ? (
            <RemoveButton
              onClick={remove}
              disabled={pending}
              label={`Remove ${initial.name}`}
            />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5">
            <Button size="fig" variant="ghost" onClick={onDone}>
              {config.copy.actions.cancel}
            </Button>
            <Button size="fig" onClick={save} disabled={pending || !valid}>
              {config.copy.actions.save}
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-wrap items-start gap-y-2 px-2">
        <EditField label="Name">
          <EditInput value={name} onChange={(e) => setName(e.target.value)} />
        </EditField>
        <EditField label="Role">
          <EditInput
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="founder, finance…"
          />
        </EditField>
        <EditField label="Gets">
          <FieldSelect
            value={gets}
            onChange={setGets}
            ariaLabel="Gets"
            compactOptions
            options={GETS.map((v) => ({
              value: v,
              label: config.copy.stakeholderGetsLabel[v],
            }))}
          />
        </EditField>
      </div>
      {!valid && (
        <p className="px-4 pt-2 font-geist text-fig-caption-2 text-red-700">
          Name and role are both required.
        </p>
      )}
    </ItemEditShell>
  );
}

export function StakeholderList({
  stakeholders,
  clientId,
}: {
  stakeholders: Stakeholder[];
  clientId: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <ul className="flex w-full flex-col gap-1 px-1">
        {stakeholders.map((s) => (
          <li key={s.id} className="w-full">
            {editingId === s.id ? (
              <StakeholderForm
                clientId={clientId}
                initial={s}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <ItemCard>
                <ProfileRowBody
                  title={s.name}
                  meta={[
                    s.role,
                    `gets ${config.copy.stakeholderGetsLabel[s.gets].toLowerCase()}`,
                  ]}
                />
                <ProfileRowEdit
                  onClick={() => setEditingId(s.id)}
                  label={`Edit ${s.name}`}
                />
              </ItemCard>
            )}
          </li>
        ))}
        {adding && (
          <li className="w-full">
            <StakeholderForm clientId={clientId} onDone={() => setAdding(false)} />
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
          Add stakeholder
        </Button>
      </ProfileFooter>
    </>
  );
}
