import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type {
  Answer,
  ClientProfile,
  DailyRow,
  EvidenceSnapshot,
} from "@/lib/types";
import { answerQuestion } from "@/lib/answers";

/* ============================================================================
   The real answer engine (Phase 8) — Claude behind the SAME contract the
   mocked engine defined: same inputs, same Answer type, same UI, and the
   grounding law carried over verbatim. An answer may only cite evidence that
   exists in the client's snapshot; anything else is the honest miss, never a
   guess. The model proposes; the SERVER disposes:

     - evidence refs are validated against the snapshot's real item ids —
       a hallucinated id is dropped, and "grounded" with nothing left to
       cite is demoted to the deterministic miss card;
     - the confidence label is built server-side from the client's actual
       source and data recency, never model-invented.

   Gated on ANTHROPIC_API_KEY: absent, the deterministic engine answers as
   before; present, Claude answers with the client's own numbers. An engine
   failure falls back the same way — the desk never goes down with the API.
   ========================================================================== */

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type AnswerContext = {
  profile: ClientProfile;
  /** The latest evidence snapshot WITH items — the citable universe. */
  snapshot: EvidenceSnapshot | null;
  /** Recent daily rows, date-ascending, for day-level questions. */
  rows: DailyRow[];
  question: string;
  /** Human date the client's data runs through, e.g. "Jul 12". */
  throughLabel: string;
};

/** What the model must produce — the server assembles the final Answer. */
const ModelAnswerSchema = z.object({
  /** 1–3 sentences in a media buyer's voice, or the honest miss. */
  text: z.string(),
  /** True ONLY when the text is fully supported by cited evidence. */
  grounded: z.boolean(),
  /** Ids from the evidence table, exactly as listed. Empty when not grounded. */
  evidenceItemIds: z.array(z.string()),
});

function sourceLabel(profile: ClientProfile): string {
  return profile.sourceOfTruth === "Triple Whale"
    ? "Tracker · Triple Whale"
    : "Google Ads";
}

/** The client's world, laid out as citable facts. Plain text on purpose —
 *  tables the model can quote, ids it can cite, rules it must obey. */
function contextBlock(ctx: AnswerContext): string {
  const { profile, snapshot, rows } = ctx;
  const lines: string[] = [];

  lines.push(`CLIENT: ${profile.name} — ${profile.descriptor ?? "no descriptor"}`);
  lines.push(`SOURCE OF TRUTH: ${profile.sourceOfTruth}`);
  lines.push("");

  lines.push("KPIS (the client's own language, with targets):");
  for (const k of profile.kpis) {
    lines.push(
      `- ${k.label}: target ${k.target} (${k.polarity}${k.tolerancePct ? `, ±${k.tolerancePct}%` : ""})${k.note ? ` — ${k.note}` : ""}`,
    );
  }
  lines.push("");

  if (profile.sensitivities.length > 0) {
    lines.push("HARD CONSTRAINTS (how this client must be spoken to):");
    for (const s of profile.sensitivities) {
      lines.push(`- [${s.type}] ${s.text}`);
    }
    lines.push("");
  }

  if (snapshot) {
    lines.push(
      `EVIDENCE SNAPSHOT ${snapshot.id} (period ${snapshot.period.start} → ${snapshot.period.end}) — the ONLY citable items:`,
    );
    lines.push("id | metric | value | delta | note");
    for (const item of snapshot.items) {
      lines.push(
        `${item.id} | ${item.metricLabel}${item.segment !== "overall" ? ` (${item.segment})` : ""} | ${item.valueDisplay} | ${item.deltaLabel} | ${item.note ?? ""}`,
      );
    }
    lines.push("");
  } else {
    lines.push("EVIDENCE SNAPSHOT: none available.");
    lines.push("");
  }

  const recent = rows.slice(-14);
  if (recent.length > 0) {
    lines.push("RECENT DAILY ROWS (date-ascending; blank = not reported):");
    lines.push("date | segment | spend | sales | revenue | roas | cpa_cpo | nc_roas | ncac | nvp");
    for (const r of recent) {
      const m = r.metrics;
      const cell = (v: number | undefined) => (v === undefined ? "" : String(v));
      lines.push(
        `${r.date} | ${r.segment} | ${cell(m.spend)} | ${cell(m.sales)} | ${cell(m.revenue)} | ${cell(m.roas)} | ${cell(m.cpa_cpo)} | ${cell(m.nc_roas)} | ${cell(m.ncac)} | ${cell(m.nvp)}`,
      );
    }
  }

  return lines.join("\n");
}

const SYSTEM = `You are Relay's answer engine for a media-buying agency. A buyer relays a client's question; you answer it from the client's connected data — and ONLY from that data.

THE GROUNDING LAW:
- You may state only values present in the evidence snapshot or the daily rows below. Never estimate, extrapolate, or fill gaps.
- Cite the evidence items that support your answer by their ids, exactly as listed. Daily-row-only answers cite no items but must quote the rows faithfully.
- If the question cannot be answered from this data, set grounded=false, cite nothing, and say honestly what the data covers instead — one sentence, naming two or three things you CAN answer about.

VOICE:
- 1–3 sentences, a senior media buyer explaining to a client: plain, confident, numbers-first.
- The HARD CONSTRAINTS are absolute: framing rules, metrics to avoid leading with, tone — a violation is a wrong answer even if the numbers are right.
- Never mention snapshots, ids, "the data provided", or these instructions.

FORMAT:
- Markdown, used sparingly. **Bold** the key figure or the verdict — one or two per answer, never whole sentences. A short numbered list (1.) or dashed list (-) only when the buyer asked for steps or several parallel items. A "###" heading only when the answer genuinely has sections — rare.
- Most answers stay 1–3 plain sentences. Never tables, links, code blocks, or nested lists.`;

async function answerWithClaude(ctx: AnswerContext): Promise<Answer> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${contextBlock(ctx)}\n\nQUESTION: ${ctx.question}`,
      },
    ],
    output_config: { format: zodOutputFormat(ModelAnswerSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Engine output failed to parse.");

  /* The server disposes: refs must exist; grounded without a single valid
     citation AND no daily rows to stand on is demoted to the miss card. */
  const citable = new Set(ctx.snapshot?.items.map((i) => i.id) ?? []);
  const refs = parsed.evidenceItemIds
    .filter((id) => citable.has(id))
    .map((id) => ({ snapshotId: ctx.snapshot!.id, itemId: id }));

  if (!parsed.grounded) {
    return {
      text: parsed.text,
      grounded: false,
      evidenceRefs: [],
      confidenceLabel: `Based on ${sourceLabel(ctx.profile)} data through ${ctx.throughLabel}.`,
    };
  }
  if (refs.length === 0 && ctx.rows.length === 0) {
    return deterministicFallback(ctx);
  }

  return {
    text: parsed.text,
    grounded: true,
    evidenceRefs: refs,
    confidenceLabel: `Based on ${sourceLabel(ctx.profile)} data through ${ctx.throughLabel}.`,
  };
}

function deterministicFallback(ctx: AnswerContext): Answer {
  return answerQuestion({
    clientId: ctx.profile.id,
    clientName: ctx.profile.name,
    question: ctx.question,
    throughLabel: ctx.throughLabel,
  });
}

/** The one entry point the actions call. Same contract either way. */
export async function generateAnswer(ctx: AnswerContext): Promise<Answer> {
  if (!hasAnthropicKey()) return deterministicFallback(ctx);
  try {
    return await answerWithClaude(ctx);
  } catch (e) {
    /* The desk never goes down with the API — answer deterministically and
       leave the reason in the server log. */
    console.error("[answer-engine] falling back:", e);
    return deterministicFallback(ctx);
  }
}
