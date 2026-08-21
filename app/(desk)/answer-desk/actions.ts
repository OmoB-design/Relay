"use server";

import { revalidatePath } from "next/cache";
import { format, parseISO } from "date-fns";
import { z } from "zod";
import { generateAnswer } from "@/lib/answer-engine";
import { config } from "@/lib/config";
import { requireProfile } from "@/lib/auth";
import { clarifyReply, resolveClientFromQuestion } from "@/lib/desk-resolve";
import type { Answer, AnswerThread, DeskChatMessage } from "@/lib/types";
import {
  answerThread,
  appendDeskExchange,
  askQuestion,
  createDeskChat,
  getClientProfile,
  getClients,
  getDailyRowsForClient,
  getDeskChat,
  getDeskChatMessages,
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
  const [profile, snapshot, rows] = await Promise.all([
    getClientProfile(clientId),
    getLatestSnapshot(clientId),
    getDailyRowsForClient(clientId, config.daily.numbersWindowDays),
  ]);
  if (!profile) throw new Error("Client not found.");
  const throughLabel = snapshot
    ? format(parseISO(snapshot.asOf), "MMM d")
    : "today";
  /* Phase 8: Claude answers over the client's own evidence when the key is
     present; the deterministic engine stands in otherwise. Same contract. */
  return generateAnswer({
    profile,
    snapshot: snapshot ?? null,
    rows,
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

/* --- The universal desk (0022) ------------------------------------------- */

/** A chat title is its first question, clipped at a word boundary. */
function chatTitle(question: string): string {
  const q = question.trim().replace(/\s+/g, " ");
  if (q.length <= 64) return q;
  const cut = q.slice(0, 64);
  return `${cut.slice(0, Math.max(40, cut.lastIndexOf(" ")))}…`;
}

const UniversalAskInput = z.object({
  /** Null starts a NEW chat — Start new chat is the only boundary. */
  chatId: z.string().uuid().nullable(),
  /** The landing card's seed, only meaningful when chatId is null. */
  scopeClientId: z.string().uuid().nullable(),
  question: z.string().trim().min(1),
});

/** One universal ask: resolve the client (name mention wins, then the chat's
 *  scope, then its last subject), answer through the same engine, persist the
 *  exchange to the chat, and dual-write resolved answers into answer_threads
 *  so the client pages and Today keep their feeds. A question that resolves
 *  to nobody gets the clarify reply — an honest question back, no guess. */
export async function askUniversalAction(
  input: z.infer<typeof UniversalAskInput>,
): Promise<{
  chatId: string;
  title: string;
  clientId: string | null;
  reply: string;
  answer: Answer | null;
}> {
  const p = UniversalAskInput.parse(input);
  const [profile, clients] = await Promise.all([
    requireProfile(),
    getClients(),
  ]);

  const chat = p.chatId ? await getDeskChat(p.chatId, profile.id) : null;
  if (p.chatId && !chat) throw new Error("Chat not found.");

  const clientId =
    resolveClientFromQuestion(p.question, clients) ??
    chat?.scopeClientId ??
    p.scopeClientId ??
    chat?.lastClientId ??
    null;

  let reply: string;
  let answer: Answer | null = null;
  if (clientId) {
    answer = await engineAnswer(clientId, p.question);
    reply = answer.text;
    await askQuestion(clientId, p.question, answer);
  } else {
    reply = clarifyReply(clients);
  }

  const chatId = chat?.id ?? crypto.randomUUID();
  const title = chat?.title ?? chatTitle(p.question);
  if (!chat) {
    await createDeskChat(chatId, profile.id, title, p.scopeClientId);
  }
  await appendDeskExchange(chatId, p.question, reply, clientId);

  if (clientId) revalidate(clientId);
  return { chatId, title, clientId, reply, answer };
}

/** A reopened chat's transcript — ownership-checked by the chat lookup. */
export async function getDeskChatMessagesAction(
  chatId: string,
): Promise<DeskChatMessage[]> {
  const profile = await requireProfile();
  const chat = await getDeskChat(z.string().uuid().parse(chatId), profile.id);
  if (!chat) throw new Error("Chat not found.");
  return getDeskChatMessages(chat.id);
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
