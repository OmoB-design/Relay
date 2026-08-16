"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { Answer, EvidenceItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EvidenceCard } from "@/components/relay/EvidenceCard";

/* AnswerCard (design.md §3): the Answer Desk response. Client-ready answer in
   Newsreader, collapsible "Supporting data" (compact evidence cards),
   confidence footer, tone toggle (Email / Slack) + Copy.
   The honest-miss variant (grounded: false) renders visibly different — dashed
   border, help icon, no evidence section — a miss must never look like an
   answer. */

const ad = config.copy.answerDesk;
const sv = config.copy.splitView;

type AnswerTone = "email" | "slack";

function formatAnswer(tone: AnswerTone, answer: Answer): string {
  if (tone === "slack") return answer.text;
  return `Hi,\n\n${answer.text}\n\n${sv.emailSignoff}\n\n${sv.signature}`;
}

export function AnswerCard({
  answer,
  items, // resolved evidence items for the answer's refs
}: {
  answer: Answer;
  items: EvidenceItem[];
}) {
  const [showData, setShowData] = useState(false);
  const [tone, setTone] = useState<AnswerTone>("slack");

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatAnswer(tone, answer));
      toast(
        `${sv.copiedToastPrefix} ${config.copy.channelLabel[tone === "email" ? "email" : "slack"]}`,
      );
    } catch {
      toast("Copy blocked — select the text manually");
    }
  }

  if (!answer.grounded) {
    return (
      <div className="rounded-lg border-hair border-dashed border-line bg-surface p-4">
        <div className="flex items-start gap-2.5">
          <CircleHelp size={16} aria-hidden="true" className="mt-1 shrink-0 text-ink-soft" />
          <div className="min-w-0">
            <p className="font-narrative text-16 text-ink">{answer.text}</p>
            <p className="mt-2 font-ui text-12 text-ink-soft">
              {answer.confidenceLabel}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="font-narrative text-16 text-ink">{answer.text}</p>

      {items.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowData((v) => !v)}
            aria-expanded={showData}
            className="inline-flex items-center gap-1 font-ui text-13 font-medium text-verdigris"
          >
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={cn("transition-transform", showData && "rotate-180")}
            />
            {ad.supportingData}
          </button>
          {showData && (
            <div className="mt-2 flex flex-col gap-2">
              {items.map((item) => (
                <EvidenceCard key={item.id} item={item} compact />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p className="font-ui text-12 text-ink-soft">{answer.confidenceLabel}</p>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Tone"
            className="flex overflow-hidden rounded-md border border-line"
          >
            {(["email", "slack"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tone === t}
                onClick={() => setTone(t)}
                className={cn(
                  "px-2.5 py-1 font-ui text-12 font-medium transition-colors",
                  tone === t
                    ? "bg-ink text-white"
                    : "bg-transparent text-ink-soft hover:text-ink",
                )}
              >
                {config.copy.channelLabel[t]}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={copy}>
            {sv.copy}
          </Button>
        </div>
      </div>
    </div>
  );
}
