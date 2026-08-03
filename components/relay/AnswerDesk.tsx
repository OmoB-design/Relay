"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { config, formatAge } from "@/lib/config";
import type {
  AnswerThread,
  ClientProfile,
  EvidenceItem,
  EvidenceSnapshot,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TokenSelect } from "@/components/relay/TokenSelect";
import { EmptyState } from "@/components/relay/EmptyState";
import { AnswerCard } from "@/components/relay/AnswerCard";
import {
  answerThreadAction,
  askQuestionAction,
} from "@/app/(app)/answer-desk/actions";

/* Answer Desk (design.md §4.4): mandatory client scope, thread column (680px),
   ask-or-paste input. Mobile-first spacing — this is the at-dinner surface. */

const ad = config.copy.answerDesk;

function resolveItems(
  snapshots: Record<string, EvidenceSnapshot>,
  refs: { snapshotId: string; itemId: string }[],
): EvidenceItem[] {
  return refs.flatMap((ref) => {
    const item = snapshots[ref.snapshotId]?.items.find(
      (i) => i.id === ref.itemId,
    );
    return item ? [item] : [];
  });
}

export function AnswerDesk({
  clients,
  selectedClientId,
  threads,
  snapshots,
}: {
  clients: Pick<ClientProfile, "id" | "name">[];
  selectedClientId?: string;
  threads: AnswerThread[];
  snapshots: Record<string, EvidenceSnapshot>;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [pending, startTransition] = useTransition();

  const questionValid = question.trim().length > 0;

  function ask() {
    if (!selectedClientId || !questionValid) return;
    startTransition(async () => {
      await askQuestionAction({
        clientId: selectedClientId,
        question: question.trim(),
      });
      setQuestion("");
      toast(ad.answeredToast);
      router.refresh();
    });
  }

  function answerWaiting(thread: AnswerThread) {
    if (!selectedClientId) return;
    startTransition(async () => {
      await answerThreadAction({
        clientId: selectedClientId,
        threadId: thread.id,
        question: thread.question,
      });
      toast(ad.answeredToast);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex max-w-thread flex-col gap-5 px-4 py-6 md:py-10">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-28 text-ink">{ad.title}</h1>
        {/* Mandatory scope: the desk is always one client's data. */}
        <TokenSelect
          aria-label="Client scope"
          value={selectedClientId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            router.push(id ? `/answer-desk?client=${id}` : "/answer-desk");
          }}
          className="max-w-xs"
        >
          <option value="" disabled>
            Select a client…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </TokenSelect>
      </header>

      {!selectedClientId ? (
        <EmptyState title={ad.pickClient}>{ad.pickClientBody}</EmptyState>
      ) : (
        <>
          {/* Thread — oldest first, like a conversation. */}
          {threads.length === 0 ? (
            <EmptyState title={ad.emptyThread}>{ad.emptyThreadBody}</EmptyState>
          ) : (
            <ol className="flex flex-col gap-5">
              {threads.map((t) => (
                <li key={t.id} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-ui text-14 font-medium text-ink">
                      {t.question}
                    </p>
                    <span className="shrink-0 font-ui text-12 text-ink-soft">
                      {formatAge(t.createdAt)} ago
                    </span>
                  </div>
                  {t.answer ? (
                    <AnswerCard
                      answer={t.answer}
                      items={resolveItems(snapshots, t.answer.evidenceRefs)}
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-lg border-hair border-dashed border-line px-4 py-3">
                      <span className="font-ui text-13 text-ink-soft">
                        {ad.waitingBadge} — forwarded, not yet answered.
                      </span>
                      <Button
                        size="sm"
                        onClick={() => answerWaiting(t)}
                        disabled={pending}
                      >
                        {ad.answerButton}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          {/* Input — sticky so it's under the thumb on a phone. */}
          <div className="sticky bottom-20 mt-2 flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 shadow-raised md:bottom-4">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={ad.inputPlaceholder}
              aria-label="Question"
              className="min-h-16 border-0 p-1 shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  ask();
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={ask}
                disabled={pending || !questionValid}
              >
                {ad.answerButton}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
