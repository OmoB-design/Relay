"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { Sensitivity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SensitivityChip } from "@/components/relay/SensitivityChip";
import { ProfileFooter, ProfileWell } from "@/components/relay/ProfileCard";
import { FieldSelect } from "@/components/relay/FieldSelect";
import { RemoveButton } from "@/components/relay/ProfileCard";
import { CloseGlyph } from "@/components/relay/NavIcons";
import {
  deleteSensitivityAction,
  saveSensitivityAction,
} from "@/app/(app)/clients/[clientId]/actions";

/* Sensitivities: chip list + the Add/Edit modal — Figma component set
   433:9379, all six variants.

   THE MODAL INVERTS THE PROFILE CARD: a white shell whose BODY sits on the
   Surface/Dashboard wash, with the footer back on the white. Header (15px
   Medium title, the one-line reason, a 14px close) rules itself off with a
   hairline inside the wash.

   THE CONSTRAINT FIELD IS RED WHEN EMPTY — the set draws required-and-missing
   as the resting state, not as a post-submit scolding: 1px Red/600 with the
   10px Red/700 line under it, Red/200 spread halo while focused-empty, then
   BLUE the moment there is text (the input-active state), and a plain
   hairline at rest once filled (the Edit variant's shape).

   The frame's own field carries digest placeholder copy ("What did you
   change…") — the Digest Input Field component reused verbatim, like the
   Stakeholders "Add KPI" slip. Visual states are the frame's; the words are
   this field's own.

   Clicking a chip opens it for editing; Add opens a blank one. */

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
  const [constraintFocused, setConstraintFocused] = useState(false);

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
        <DialogContent
          showCloseButton={false}
          className="w-full gap-0 rounded-18 border-fig border-border bg-surface-primary p-0 shadow-card sm:max-w-sheet"
        >
          {/* The wash body, inset 4px on the white shell (node 433:9387). */}
          <div className="p-1">
            <div className="flex w-full flex-col gap-4 rounded-14 border-fig border-border bg-surface-dashboard pb-3 pt-2">
              {/* Header: title, the one-line reason, the 14px close. */}
              <div className="flex w-full items-start gap-2.5 px-4 pb-3 divider-b border-border">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <DialogTitle className="font-geist text-fig-body-lg fig-medium text-heading-01">
                    {editingId ? "Edit Sensitivity" : "Add Sensitivity"}
                  </DialogTitle>
                  <DialogDescription className="font-geist text-fig-caption-1 text-heading-06">
                    A structured constraint the narrative layer must obey —
                    typed, not a note.
                  </DialogDescription>
                </div>
                <DialogClose
                  aria-label={config.copy.actions.cancel}
                  className="shrink-0 text-heading-01 outline-none hover:text-heading-05 focus-visible:text-heading-05"
                >
                  <CloseGlyph />
                </DialogClose>
              </div>

              <div className="flex w-full flex-col gap-2 px-4">
                <div className="flex flex-col gap-1 pb-1">
                  <span
                    id="sensitivity-type-label"
                    className="font-geist text-fig-caption-1 text-heading-06"
                  >
                    Type
                  </span>
                  <FieldSelect
                    value={type}
                    onChange={setType}
                    ariaLabel="Type"
                    size="field-lg"
                    options={TYPES.map((value) => ({
                      value,
                      label: config.copy.sensitivityTypeLabel[value],
                    }))}
                  />
                </div>

                <div className="flex flex-col gap-1 pb-1">
                  <label
                    htmlFor="sensitivity-constraint"
                    className="font-geist text-fig-caption-1 text-heading-06"
                  >
                    Constraint
                  </label>
                  <div className="flex w-full flex-col gap-1.5">
                    {/* Required-and-missing is the RESTING state: red at 1px
                        with its hint, a Red/200 spread halo while focused,
                        then the input-active blue the moment text exists, and
                        the plain hairline once filled and resting. */}
                    <Textarea
                      id="sensitivity-constraint"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onFocus={() => setConstraintFocused(true)}
                      onBlur={() => setConstraintFocused(false)}
                      placeholder='e.g. "Frame cost per order weekly, never daily."'
                      aria-invalid={!textValid}
                      className={cn(
                        "min-h-textarea w-full rounded-12 bg-surface-primary px-2 pt-3 font-geist text-fig-caption-1 text-heading-02 shadow-none outline-none ring-0 placeholder:text-caption-1 focus-visible:ring-0 md:text-fig-caption-1",
                        textValid
                          ? constraintFocused
                            ? "border border-blue-500 shadow-input-active"
                            : "border-fig border-border"
                          : cn(
                              "border border-red-600",
                              constraintFocused && "shadow-invalid-active",
                            ),
                      )}
                    />
                    {!textValid && (
                      <p className="font-geist text-fig-caption-2 text-red-700">
                        The constraint text is required.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer on the white shell (node 433:9422). Edit carries Remove
              on the left; both end Cancel then Save. */}
          <div
            className={cn(
              "flex w-full items-center gap-1.5 p-2.5",
              editingId ? "justify-between" : "justify-end",
            )}
          >
            {editingId && (
              <RemoveButton
                onClick={remove}
                disabled={pending}
                label="Remove sensitivity"
              />
            )}
            <div className="flex items-center gap-1.5">
              <Button size="fig" variant="ghost" onClick={() => setOpen(false)}>
                {config.copy.actions.cancel}
              </Button>
              <Button size="fig" onClick={save} disabled={pending || !textValid}>
                {config.copy.actions.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
