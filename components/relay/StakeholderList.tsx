"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { config } from "@/lib/config";
import type { Stakeholder } from "@/lib/types";
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
  deleteStakeholderAction,
  saveStakeholderAction,
} from "@/app/(app)/clients/[clientId]/actions";

/* Stakeholder list — restyled to node 425:6828's rows: 59px, the name over
   "role · gets X version" with a 3px dot, pencil Edit, Add as the footer.
   Inline row editing + add + remove survive the restyle.

   The frame's own footer literally reads "Add KPI" — a copy-paste slip in the
   Figma file (flagged); this says what the button does. */

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
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="font-geist text-fig-caption-2 text-heading-06">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-geist text-fig-caption-2 text-heading-06">Role</span>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="founder, finance…"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-geist text-fig-caption-2 text-heading-06">Gets</span>
          <TokenSelect
            value={gets}
            onChange={(e) => setGets(e.target.value as Gets)}
          >
            {GETS.map((v) => (
              <option key={v} value={v}>
                {config.copy.stakeholderGetsLabel[v]}
              </option>
            ))}
          </TokenSelect>
        </label>
      </div>
      {!valid && (
        <p className="font-geist text-fig-caption-2 text-red-700">
          Name and role are both required.
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button size="fig" onClick={save} disabled={pending || !valid}>
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
      <ProfileRows>
        {stakeholders.map((s, i) => (
          <ProfileRow key={s.id} first={i === 0} editing={editingId === s.id}>
            {editingId === s.id ? (
              <StakeholderForm
                clientId={clientId}
                initial={s}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div className="flex h-full items-center justify-between gap-2 px-2">
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
              </div>
            )}
          </ProfileRow>
        ))}
        {adding && (
          <ProfileRow first={stakeholders.length === 0} editing>
            <StakeholderForm clientId={clientId} onDone={() => setAdding(false)} />
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
          Add stakeholder
        </Button>
      </ProfileFooter>
    </>
  );
}
