"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { config } from "@/lib/config";
import type { Sensitivity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SensitivityChip } from "@/components/relay/SensitivityChip";
import { ProfileFooter, ProfileWell } from "@/components/relay/ProfileCard";
import { TokenSelect } from "@/components/relay/TokenSelect";
import {
  deleteSensitivityAction,
  saveSensitivityAction,
} from "@/app/(app)/clients/[clientId]/actions";

/* Sensitivities: chip list + structured add/edit Dialog (design.md §4.2).
   Always a typed object — constraint text + type enum. Never a notes area.
   Clicking a chip opens it for editing; "Add sensitivity" opens a blank one. */

type SensitivityType = Sensitivity["type"];

const TYPES = Object.keys(
  config.copy.sensitivityTypeLabel,
) as SensitivityType[];

export function SensitivityEditor({
  sensitivities,
  clientId,
}: {
  sensitivities: Sensitivity[];
  clientId: string;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [type, setType] = useState<SensitivityType>("framing");
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const textValid = text.trim().length > 0;

  function openFor(s?: Sensitivity) {
    setEditingId(s?.id);
    setType(s?.type ?? "framing");
    setText(s?.text ?? "");
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      await saveSensitivityAction({
        clientId,
        id: editingId,
        type,
        text: text.trim(),
      });
      setOpen(false);
      toast(config.copy.actions.saved);
    });
  }

  function remove() {
    if (!editingId) return;
    startTransition(async () => {
      await deleteSensitivityAction(clientId, editingId);
      setOpen(false);
      toast("Sensitivity removed");
    });
  }

  return (
    <>
      {/* One chip per row (node 425:6785 stacks them), each still a button
          that opens its editor. */}
      <ProfileWell className="flex flex-col items-start gap-2 px-2 py-4">
        {sensitivities.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => openFor(s)}
            aria-label={`Edit sensitivity: ${s.text}`}
            className="max-w-full rounded-full"
          >
            <SensitivityChip sensitivity={s} />
          </button>
        ))}
        {sensitivities.length === 0 && (
          <p className="px-0.5 font-geist text-fig-caption-1 text-caption-1">
            {config.copy.sensitivityEmpty}
          </p>
        )}
      </ProfileWell>

      <Dialog open={open} onOpenChange={setOpen}>
        <ProfileFooter>
          <DialogTrigger asChild>
            <Button
              size="fig"
              variant="muted"
              className="flex-1"
              onClick={() => openFor()}
            >
              Add Sensitivity
            </Button>
          </DialogTrigger>
        </ProfileFooter>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-geist text-fig-body-lg fig-medium text-heading-01">
              {editingId ? "Edit sensitivity" : "Add sensitivity"}
            </DialogTitle>
            <DialogDescription className="font-geist text-fig-caption-1 text-heading-06">
              A structured constraint the narrative layer must obey — typed, not
              a note.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-geist text-fig-caption-2 text-heading-06">Type</span>
              <TokenSelect
                value={type}
                onChange={(e) => setType(e.target.value as SensitivityType)}
              >
                {TYPES.map((value) => (
                  <option key={value} value={value}>
                    {config.copy.sensitivityTypeLabel[value]}
                  </option>
                ))}
              </TokenSelect>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-geist text-fig-caption-2 text-heading-06">Constraint</span>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='e.g. "Frame cost per order weekly, never daily."'
                aria-invalid={!textValid}
              />
            </label>
            {!textValid && (
              <p className="font-geist text-fig-caption-2 text-red-700">
                The constraint text is required.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editingId ? (
              <Button
                size="fig"
                variant="ghost"
                onClick={remove}
                disabled={pending}
                className="text-red-700"
              >
                {config.copy.actions.remove}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {config.copy.actions.cancel}
              </Button>
              <Button onClick={save} disabled={pending || !textValid}>
                {config.copy.actions.save}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
