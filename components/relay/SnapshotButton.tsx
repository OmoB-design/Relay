"use client";

import { useState } from "react";
import { Database } from "lucide-react";
import { formatAsOf } from "@/lib/config";
import type { EvidenceSnapshot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EvidenceCard } from "@/components/relay/EvidenceCard";

/* "View data snapshot" — the pinned-evidence viewer, shared by the Timeline
   feed and the Library artifact view. Snapshots are immutable: an artifact is
   forever shown against the data it was written from, never re-computed. */

export function SnapshotButton({
  snapshot,
  label = "View data snapshot",
}: {
  snapshot: EvidenceSnapshot;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Database size={14} aria-hidden="true" /> {label}
      </Button>
      <DialogContent className="max-h-dialog-cap overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-22 text-ink">
            Data snapshot — {snapshot.period.label}
          </DialogTitle>
          <DialogDescription className="font-ui text-13 text-ink-soft">
            The evidence this was written from, pinned at the time. Artifacts are
            never re-computed against newer data.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {snapshot.items.map((item) => (
            <EvidenceCard key={item.id} item={item} compact />
          ))}
        </div>
        <p className="font-ui text-12 text-ink-soft">
          as of {formatAsOf(snapshot.asOf)}
        </p>
      </DialogContent>
    </Dialog>
  );
}
