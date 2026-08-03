"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { config } from "@/lib/config";
import type { EvidenceItem, LoomHeadline } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateLoomHeadlineAction } from "@/app/(app)/clients/[clientId]/narratives/[narrativeId]/loom/actions";

/* LoomHeadlineCard (design.md §3): one glance-formatted headline — bold claim
   set in Fraunces (this is SCANNED, not read), its one supporting number
   large, source chip small. Editable independently of the narrative's claims:
   a buyer may want different emphasis for video vs. text. */

function sourceChipLabel(item: EvidenceItem): string {
  return item.source === "Tracker" && item.sourceOfTruth
    ? `Tracker · ${item.sourceOfTruth}`
    : item.source;
}

export function LoomHeadlineCard({
  headline,
  items, // resolved evidence items for this headline's refs, in ref order
  clientId,
  narrativeId,
}: {
  headline: LoomHeadline;
  items: EvidenceItem[];
  clientId: string;
  narrativeId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(headline.text);
  const [pending, startTransition] = useTransition();

  const lead = items[0]; // the one supporting number, large
  const chips = Array.from(new Set(items.map(sourceChipLabel)));
  const textValid = text.trim().length > 0;

  function save() {
    startTransition(async () => {
      await updateLoomHeadlineAction({
        clientId,
        narrativeId,
        headlineId: headline.id,
        text: text.trim(),
      });
      setEditing(false);
      toast(config.copy.actions.saved);
    });
  }

  return (
    <article className="rounded-lg border border-line bg-surface p-5">
      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Headline text"
            aria-invalid={!textValid}
            className="font-display text-18"
          />
          {!textValid && (
            <p className="font-ui text-12 text-negative">
              Headline text is required.
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={pending || !textValid}>
              {config.copy.actions.save}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setText(headline.text);
                setEditing(false);
              }}
            >
              {config.copy.actions.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-22 font-semibold text-ink">
              {headline.text}
            </h3>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {lead && (
                <span className="font-display text-28 text-verdigris">
                  {lead.valueDisplay}
                </span>
              )}
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full border border-line bg-paper px-2 py-0.5 font-ui text-12 text-ink-soft"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            aria-label={`Edit headline ${headline.order}`}
          >
            <Pencil size={14} aria-hidden="true" />
          </Button>
        </div>
      )}
    </article>
  );
}
