"use server";

import { revalidatePath } from "next/cache";
import { format, parseISO } from "date-fns";
import { z } from "zod";
import { answerQuestion } from "@/lib/answers";
import type { Answer, AnswerThread } from "@/lib/types";
import {
  answerThread,
  askQuestion,
  getClientProfile,
  getLatestSnapshot,
  getThreadsForClient,
} from "@/lib/data";

/* Answer Desk actions. The mock engine runs server-side so Phase 8 can swap in
   the real one behind the same actions — the UI contract never changes. */

function revalidate(clientId: string) {
  revalidatePath("/answer-desk");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/today");
}

async function engineAnswer(clientId: string, question: string) {
  const [profile, snapshot] = await Promise.all([
    getClientProfile(clientId),
    getLatestSnapshot(clientId),
  ]);
  if (!profile) throw new Error("Client not found.");
  const throughLabel = snapshot
    ? format(parseISO(snapshot.asOf), "MMM d")
    : "today";
  return answerQuestion({
    clientId,
    clientName: profile.name,
    question,
    throughLabel,
  });
}

const AskInput = z.object({
  clientId: z.string().uuid(),
  question: z.string().trim().min(1),
});

export async function askQuestionAction(input: z.infer<typeof AskInput>) {
  const p = AskInput.parse(input);
  const answer = await engineAnswer(p.clientId, p.question);
  await askQuestion(p.clientId, p.question, answer);
  revalidate(p.clientId);
}

/** The desk conversation's ask: same engine, same persistence, but the answer
 *  comes BACK to the caller — the transcript streams it in place instead of
 *  waiting for a refresh, and the new thread joins the chat rail by id. The
 *  FULL answer returns, grounded flag and confidence included: an honest miss
 *  must never be dressed as an answer on the client. */
export async function askDeskQuestionAction(
  input: z.infer<typeof AskInput>,
): Promise<{ threadId: string; answer: Answer }> {
  const p = AskInput.parse(input);
  const answer = await engineAnswer(p.clientId, p.question);
  const threadId = await askQuestion(p.clientId, p.question, answer);
  revalidate(p.clientId);
  return { threadId, answer };
}

/** The chat rail's history for a client picked CLIENT-SIDE — the landing pick
 *  never round-trips the page, so the threads come by action instead. */
export async function getDeskThreadsAction(
  clientId: string,
): Promise<AnswerThread[]> {
  return getThreadsForClient(z.string().uuid().parse(clientId));
}

const AnswerThreadInput = z.object({
  clientId: z.string().uuid(),
  threadId: z.string().uuid(),
  question: z.string().trim().min(1),
});

export async function answerThreadAction(
  input: z.infer<typeof AnswerThreadInput>,
) {
  const p = AnswerThreadInput.parse(input);
  const answer = await engineAnswer(p.clientId, p.question);
  await answerThread(p.threadId, answer);
  revalidate(p.clientId);
}
