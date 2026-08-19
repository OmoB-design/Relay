"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { ClientAvatar } from "@/components/relay/ClientAvatar";
import { MicGlyph, PlusGlyph, RelayMark } from "@/components/relay/NavIcons";
import {
  answerThreadAction,
  askQuestionAction,
} from "@/app/(app)/answer-desk/actions";

/* Answer Desk. The unscoped state is the desk's LANDING (Figma node 612:7139):
   a centred greeting, the chatbox, and a client picker — the desk introduces
   itself the way a chat app does, rather than opening on an empty dropdown.

   Scope is still mandatory (design.md §4.4): the chatbox on the landing cannot
   answer anything, because there is no client behind it yet. Anything that
   would submit — Enter, the composer buttons — lands on the same nudge, and
   the question SURVIVES the nudge so picking a client doesn't eat the typing.

   The scoped thread view below it is the pre-redesign surface, kept working
   verbatim; its frames arrive with the desk's component nodes. */

const ad = config.copy.answerDesk;

type DeskClient = Pick<
  ClientProfile,
  "id" | "name" | "descriptor" | "logoUrl"
>;

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

/* --- The landing (node 612:7139) --------------------------------------- */

/** The chatbox (component 615:12432). A pinned 130px frame: the prompt line
 *  rides the top, the composer controls ride the bottom edge. */
function DeskChatbox({ onNudge }: { onNudge: () => void }) {
  const [question, setQuestion] = useState("");

  return (
    <form
      className="flex h-chatbox w-full flex-col gap-4 overflow-clip rounded-20 border-fig border-grey-150 bg-surface-dashboard pb-5 pt-1 shadow-chatbox"
      onSubmit={(e) => {
        e.preventDefault();
        onNudge();
      }}
    >
      <div className="flex w-full min-h-0 flex-1 px-4 pb-3 pt-3.5">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={ad.inputPlaceholder}
          aria-label="Question"
          className="size-full resize-none bg-transparent font-geist text-fig-body-lg text-heading-01 outline-none placeholder:text-heading-06"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onNudge();
            }
          }}
        />
      </div>
      <div className="flex w-full items-center justify-between px-4">
        <button
          type="button"
          aria-label="Add media"
          onClick={onNudge}
          className="flex size-7.5 items-center justify-center rounded-8 text-icon-system transition-colors duration-200 ease-out hover:bg-surface-foreground-01"
        >
          <PlusGlyph className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Voice input"
          onClick={onNudge}
          className="flex size-7.5 items-center justify-center rounded-8 text-icon-system transition-colors duration-200 ease-out hover:bg-surface-foreground-01"
        >
          <MicGlyph className="size-4" />
        </button>
      </div>
    </form>
  );
}

/** One picker row (component 612:9952): the digest band's client mark inside
 *  its own washed tile, the name, and the client's own descriptor. The row
 *  itself only surfaces on hover — the wash pill of the frame's active state. */
function DeskClientCard({ client }: { client: DeskClient }) {
  return (
    <Link
      href={`/answer-desk?client=${client.id}`}
      className="flex items-center gap-2.5 rounded-10 p-2 transition-colors duration-200 ease-out hover:bg-surface-foreground-01"
    >
      <span className="flex size-desk-tile shrink-0 items-center justify-center rounded-8 border-fig border-border bg-surface-dashboard bg-clip-padding">
        <ClientAvatar name={client.name} logo={client.logoUrl} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-geist text-fig-body fig-w450 text-heading-01">
          {client.name}
        </span>
        {client.descriptor ? (
          <span className="truncate font-geist text-fig-caption-1 text-heading-06">
            {client.descriptor}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function DeskLanding({
  greetName,
  clients,
}: {
  greetName: string;
  clients: DeskClient[];
}) {
  function nudge() {
    toast(ad.pickClient);
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-5 py-8 md:px-6">
      <div className="flex w-full max-w-desk flex-col gap-12 px-0.5">
        <header className="flex w-full flex-col items-center gap-2">
          <RelayMark size={30} className="size-mark-lg" />
          <h1 className="text-center font-greeting text-fig-greeting fig-medium tracking-greeting text-heading-01">
            <span className="sr-only">{ad.title} — </span>
            {ad.greetingPrefix} {greetName}
          </h1>
        </header>

        <DeskChatbox onNudge={nudge} />

        <section className="flex w-full flex-col gap-6 p-1">
          <h2 className="w-full font-geist text-fig-body fig-w450 text-heading-06">
            {ad.pickClient}
          </h2>
          {clients.length === 0 ? (
            <p className="w-full font-geist text-fig-caption-1 text-heading-06">
              {ad.pickClientBody}
            </p>
          ) : (
            <div className="grid w-full grid-cols-1 gap-2.5 md:grid-cols-2">
              {clients.map((c) => (
                <DeskClientCard key={c.id} client={c} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* --- The scoped desk (pre-redesign, kept until its nodes arrive) -------- */

export function AnswerDesk({
  greetName,
  clients,
  selectedClientId,
  threads,
  snapshots,
}: {
  /** The buyer's first name — the landing greets a person, not a role. */
  greetName: string;
  clients: DeskClient[];
  selectedClientId?: string;
  threads: AnswerThread[];
  snapshots: Record<string, EvidenceSnapshot>;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [pending, startTransition] = useTransition();

  const questionValid = question.trim().length > 0;

  if (!selectedClientId) {
    return <DeskLanding greetName={greetName} clients={clients} />;
  }

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
          value={selectedClientId}
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
          placeholder="Ask, or paste a client's question…"
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
    </div>
  );
}
