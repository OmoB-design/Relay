/* ============================================================================
   Deterministic client resolution for the universal desk — the Phase-8 model
   will do this with tools; until then the closed set of client names IS the
   router. A question names a client, or it rides the chat's last subject, or
   the desk asks which client is meant. First mention wins when several names
   appear (cross-client comparison is a Phase-8 answer, not a guess).
   ========================================================================== */

export function resolveClientFromQuestion(
  question: string,
  clients: { id: string; name: string }[],
): string | null {
  const q = question.toLowerCase();
  const hits = clients
    .map((c) => ({ id: c.id, at: q.indexOf(c.name.toLowerCase()) }))
    .filter((h) => h.at >= 0)
    .sort((a, b) => a.at - b.at);
  return hits[0]?.id ?? null;
}

/** The honest miss when nothing resolves — a question, not a guess. */
export function clarifyReply(clients: { name: string }[]): string {
  const names = clients.map((c) => c.name);
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`
      : (names[0] ?? "a client");
  return `Which client is this about? I can help with ${list} — name one and I'll pull their numbers.`;
}
