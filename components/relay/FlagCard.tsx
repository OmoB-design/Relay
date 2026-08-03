"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarX, Check, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { Flag } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/* FlagCard (design.md §3): flag-wash card, headline + diagnostic, two actions.
   Dismiss uses the reason-capture pattern — the button is enabled, but clicking
   reveals an inline reason input and commit is blocked until it is non-empty
   (mirrors the agency's "flag it to Mitzi with a reason" discipline). */

type Mode = "idle" | "confirming" | "dismissed";

export function FlagCard({
  flag,
  clientName,
  onDismiss,
  onEditSend,
  className,
}: {
  flag: Flag;
  clientName?: string; // shown on cross-client surfaces like Today
  onDismiss?: (reason: string) => void;
  onEditSend?: () => void;
  className?: string;
}) {
  const [mode, setMode] = useState<Mode>(
    flag.status === "dismissed" ? "dismissed" : "idle",
  );
  const [reason, setReason] = useState(flag.dismissalReason ?? "");

  const Icon = flag.kind === "freshness" ? CalendarX : TriangleAlert;
  const canEditSend = Boolean(flag.draftNote);
  const reasonValid = reason.trim().length > 0;

  function commitDismiss() {
    if (!reasonValid) return;
    onDismiss?.(reason.trim());
    setMode("dismissed");
  }

  return (
    <article
      className={cn(
        "rounded-lg border border-line bg-flag-wash p-4",
        mode === "dismissed" && "opacity-70",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-flag" />
        <div className="flex-1">
          {clientName && (
            <p className="mb-1 font-display text-16 text-ink">{clientName}</p>
          )}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-ui text-13 uppercase tracking-wide text-flag">
              {flag.metricLabel}
            </span>
            <span className="font-ui text-13 text-ink-soft">
              {flag.deltaLabel}
            </span>
          </div>
          <p className="mt-1 font-ui text-16 text-ink">{flag.headline}</p>
          <p className="mt-1 font-ui text-14 text-ink-soft">{flag.diagnostic}</p>

          {mode === "dismissed" ? (
            <p className="mt-3 font-ui text-13 text-ink-soft">
              Dismissed — {reason}
            </p>
          ) : (
            <div className="mt-3">
              <AnimatePresence initial={false} mode="wait">
                {mode === "idle" ? (
                  <motion.div
                    key="actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: config.motion.fast / 1000 }}
                    className="flex flex-wrap gap-2"
                  >
                    {canEditSend && (
                      <Button size="sm" onClick={onEditSend}>
                        Edit &amp; send
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMode("confirming")}
                    >
                      Dismiss
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: config.motion.base / 1000 }}
                    className="flex flex-col gap-2"
                  >
                    <Textarea
                      autoFocus
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={config.copy.dismissReasonPlaceholder}
                      className="min-h-16 bg-surface"
                      aria-label="Reason for dismissing"
                      aria-invalid={!reasonValid}
                    />
                    {!reasonValid && (
                      <p className="font-ui text-12 text-negative">
                        A reason is required before dismissing.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={commitDismiss}
                        disabled={!reasonValid}
                      >
                        <Check size={14} aria-hidden="true" /> Confirm dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMode("idle")}
                      >
                        <X size={14} aria-hidden="true" /> Cancel
                      </Button>
                    </div>
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
