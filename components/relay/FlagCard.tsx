"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { Flag } from "@/lib/types";
import { ClientAvatar } from "@/components/relay/ClientAvatar";
import { Dot } from "@/components/relay/SourceChip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/* FlagCard — Figma component set "Flag" (node 3:15460), 7 variants.

   Anatomy: nested rounded shells, then a tinted panel holding a header strip
   (client mark · name · category · delta) above the headline and diagnostic,
   with the actions in a footer outside the panel.

   THREE PLACES THIS DEPARTS FROM THE FRAMES, deliberately:

   1. `dismissed` and `resolved` render NO action buttons. The frames show
      Dismiss (and on dismissed, Edit & send) still present, but there is nothing
      left to do to either: a dismissal is already recorded with its reason, and
      a resolved flag was retracted by the engine. Live buttons there would
      either no-op or re-dismiss something already dismissed.

   2. The dismiss placeholder is the flag's own copy, not "What did you change,
      and why?" — that string belongs to the digest's number edit. The frames
      carry it across from that component; the helper line beneath ("A reason is
      required before dismissing") is the one that matches this context.

   3. The category label is not force-uppercased. One frame shows
      "COST PER ORDER" while its siblings show "NCAC" and "Tracker Freshness" as
      authored; several client KPI labels read as prose mid-sentence ("cost per
      order", "weekly orders"), and shouting them changes their register.       */

type Mode = "idle" | "confirming" | "dismissed";

/* Figma nests three shells, each with its own hairline and lift:
     outer  border 1px
     card   border 0.8px + shadow 0 1.5px 2px
     inner  border 0.7px + shadow 0 0 9.3px                                   */
const SHELL = "overflow-hidden rounded-18 border border-border";
const CARD =
  "overflow-hidden rounded-18 border-fig-08 border-border bg-surface-primary shadow-card";
const INNER =
  "overflow-hidden rounded-18 border-fig-07 border-border bg-surface-primary shadow-card-inner";
const PANEL =
  "flex flex-col gap-4 overflow-hidden rounded-14 border-fig-thin border-border bg-panel py-2";

export function FlagCard({
  flag,
  clientName,
  clientLogo,
  onDismiss,
  onEditSend,
  className,
}: {
  flag: Flag;
  clientName?: string; // shown on cross-client surfaces like Today
  /** Path under /public. Absent → the avatar falls back to initials. */
  clientLogo?: string;
  onDismiss?: (reason: string) => void;
  onEditSend?: () => void;
  className?: string;
}) {
  const [mode, setMode] = useState<Mode>(
    flag.status === "dismissed" ? "dismissed" : "idle",
  );
  const [reason, setReason] = useState(flag.dismissalReason ?? "");

  const canEditSend = Boolean(flag.draftNote);
  const reasonValid = reason.trim().length > 0;
  // Settled: a human dismissed it, or the engine retracted it. Read-only.
  const settled = mode === "dismissed" || flag.status === "resolved";

  function commitDismiss() {
    if (!reasonValid) return;
    onDismiss?.(reason.trim());
    setMode("dismissed");
  }

  return (
    <article className={cn(SHELL, className)}>
      <div className={CARD}>
        <div className={INNER}>
          <div className="p-1">
            <div className={PANEL}>
              {/* Header strip — who, and what moved. */}
              <div className="flex flex-col divider-b border-border px-2 pb-3">
                <div className="flex items-center gap-2">
                  <ClientAvatar name={clientName ?? ""} logo={clientLogo} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {clientName && (
                      <p className="font-geist text-fig-body fig-w450 text-heading-01">
                        {clientName}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-geist text-fig-caption-1 text-yellow-600">
                        {flag.metricLabel}
                      </span>
                      <Dot size="md" />
                      <span className="font-geist text-fig-caption-1 text-heading-06">
                        {flag.deltaLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body — the claim, then why Relay thinks so. */}
              <div className="flex flex-col justify-center gap-2.5 px-2 pb-3">
                <p className="font-geist text-fig-body fig-medium text-heading-01">
                  {flag.headline}
                </p>
                <p className="font-geist text-fig-caption-1 text-heading-05">
                  {flag.diagnostic}
                </p>

                {mode === "confirming" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: config.motion.base / 1000 }}
                    className="flex flex-col gap-1.5 pt-1.5"
                  >
                    <Textarea
                      autoFocus
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={config.copy.dismissReasonPlaceholder}
                      aria-label="Reason for dismissing"
                      aria-invalid={!reasonValid}
                      className={cn(
                        "min-h-16 rounded-12 border-red-600 bg-surface-primary px-2 py-2 font-geist text-fig-caption-1 text-heading-02 md:text-fig-caption-1 placeholder:text-caption-1",
                        !reasonValid && "field-invalid",
                      )}
                    />
                    {!reasonValid && (
                      <p className="font-geist text-fig-caption-2 text-red-700">
                        {config.copy.dismissReasonRequired}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* A settled flag states its outcome instead of offering actions. */}
                {settled && (
                  <p className="font-geist text-fig-caption-1 text-caption-1">
                    {mode === "dismissed"
                      ? `${config.copy.dismissedPrefix} ${reason}`
                      : config.copy.resolvedNote}
                  </p>
                )}
              </div>
            </div>
          </div>

          {!settled && (
            <div className="flex flex-col justify-center gap-1.5 p-2.5">
              <AnimatePresence initial={false} mode="wait">
                {mode === "idle" ? (
                  <motion.div
                    key="actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: config.motion.fast / 1000 }}
                    className="flex items-center justify-end gap-1.5"
                  >
                    <Button
                      size="fig"
                      variant="outline"
                      onClick={() => setMode("confirming")}
                    >
                      {config.copy.actions.dismiss}
                    </Button>
                    {canEditSend && (
                      <Button size="fig" onClick={onEditSend}>
                        {config.copy.actions.editSend}
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: config.motion.fast / 1000 }}
                    className="flex items-center justify-end gap-1.5"
                  >
                    <Button
                      size="fig"
                      variant="ghost"
                      onClick={() => setMode("idle")}
                    >
                      {config.copy.actions.cancel}
                    </Button>
                    <Button
                      size="fig"
                      onClick={commitDismiss}
                      disabled={!reasonValid}
                    >
                      {config.copy.actions.confirmDismiss}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
