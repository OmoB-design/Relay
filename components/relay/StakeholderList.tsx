"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { config } from "@/lib/config";
import type { Stakeholder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TokenSelect } from "@/components/relay/TokenSelect";
import {
  deleteStakeholderAction,
  saveStakeholderAction,
} from "@/app/(app)/clients/[clientId]/actions";

/* Stakeholder list (design.md §4.2): name, role, gets (short/full/deck).
   Inline row editing + add + remove. */

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
          <span className="font-ui text-12 text-ink-soft">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-ui text-12 text-ink-soft">Role</span>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="founder, finance…"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-ui text-12 text-ink-soft">Gets</span>
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
        <p className="font-ui text-12 text-negative">
          Name and role are both required.
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={pending || !valid}>
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
    <ul className="divide-y divide-line">
      {stakeholders.map((s) => (
        <li key={s.id} className="px-4 py-3">
          {editingId === s.id ? (
            <StakeholderForm
              clientId={clientId}
              initial={s}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-ui text-14 text-ink">{s.name}</span>
                <span className="block font-ui text-12 text-ink-soft">
                  {s.role} · gets {config.copy.stakeholderGetsLabel[s.gets].toLowerCase()}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingId(s.id)}
                aria-label={`Edit ${s.name}`}
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
          <StakeholderForm clientId={clientId} onDone={() => setAdding(false)} />
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus size={14} aria-hidden="true" /> Add stakeholder
          </Button>
        )}
      </li>
    </ul>
  );
}
