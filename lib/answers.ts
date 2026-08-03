import type { Answer } from "@/lib/types";

/* ============================================================================
   Mocked answer engine (Phase 5). Pattern-matches the seeded questions from
   SEED.md to pre-authored, evidence-grounded AnswerCards; everything else gets
   the honest "can't answer from connected data" card.

   THIS DEFINES THE CONTRACT Phase 8's real engine must satisfy: same input,
   same Answer type, same UI. The grounding rule carries over verbatim —
   answers may only reference values present in the snapshot; the miss card is
   the fallback, never a guess.
   ========================================================================== */

const NORTHBROOK = "11111111-0000-4000-8000-000000000001";
const BIRKENSTOCK = "11111111-0000-4000-8000-000000000002";
const SWITCHUP = "11111111-0000-4000-8000-000000000003";
const SNAP_NB = "11111111-0000-4000-8000-0000000000a1";
const SNAP_SU = "11111111-0000-4000-8000-0000000000a3";

type AuthoredAnswer = {
  /** Any one pattern matching the question → this answer. */
  match: RegExp[];
  answer: Answer;
};

/** Pre-authored grounded answers, per client (SEED.md "Answer Desk seeds"). */
const AUTHORED: Record<string, AuthoredAnswer[]> = {
  [NORTHBROOK]: [
    {
      // Q1: "Saw spend was really high on Thursday, everything ok?"
      match: [/thursday/i, /spend.*(high|spike|jump|ok)/i],
      answer: {
        text: "Thursday ran $10.4k, about 38% over the daily average, because the new Performance Max campaign exited learning and Google front-loaded delivery. Cost per order actually came in 12% under target that day — this is the algorithm scaling a winner, not waste.",
        grounded: true,
        evidenceRefs: [
          { snapshotId: SNAP_NB, itemId: "E1" },
          { snapshotId: SNAP_NB, itemId: "E3" },
        ],
        confidenceLabel: "Based on Google Ads data through Thu Jul 9.",
      },
    },
    {
      // Q2: "How is the new creative angle doing?"
      match: [/creative|angle|asset|objection/i],
      answer: {
        text: "The objection-handling asset group is now driving 31% of conversions at $23.10 cost per order — the cheapest of any group in the account since it launched the week of Jun 22.",
        grounded: true,
        evidenceRefs: [{ snapshotId: SNAP_NB, itemId: "E4" }],
        confidenceLabel: "Based on Google Ads data through Jul 12.",
      },
    },
  ],
  [SWITCHUP]: [
    {
      // Formal register per this client's tone sensitivity; ROAS-led, and it
      // references trajectory (their framing sensitivity).
      match: [/roas|aov|order value|performance|trajectory/i],
      answer: {
        text: "Blended ROAS closed the week at 3.15, ahead of the 3.0 benchmark and continuing the upward trajectory of the prior fortnight. Average order value held at $98.40, modestly above the $96 target, on media investment of $31.5k.",
        grounded: true,
        evidenceRefs: [
          { snapshotId: SNAP_SU, itemId: "H1" },
          { snapshotId: SNAP_SU, itemId: "H2" },
          { snapshotId: SNAP_SU, itemId: "H3" },
        ],
        confidenceLabel: "Based on Google Ads data through Jul 5.",
      },
    },
  ],
};

/** Topic suggestions for the miss card, in each client's own vocabulary. */
const MISS_TOPICS: Record<string, string> = {
  [NORTHBROOK]: "spend, cost per order, orders, NCAC, or the asset groups",
  [BIRKENSTOCK]: "NC ROAS, NCAC, revenue, or the new-customer mix",
  [SWITCHUP]: "blended ROAS, average order value, or media investment",
};
const MISS_TOPICS_DEFAULT = "spend, ROAS, AOV, or recent performance";

/** The honest miss: what Relay says when the connected data can't answer. */
function missCard(
  clientId: string,
  clientName: string,
  throughLabel: string,
): Answer {
  const topics = MISS_TOPICS[clientId] ?? MISS_TOPICS_DEFAULT;
  return {
    text: `I can't answer that from ${clientName}'s connected data (Google Ads + Tracker, through ${throughLabel}). Try asking about ${topics}.`,
    grounded: false,
    evidenceRefs: [],
    confidenceLabel: `Based on connected data through ${throughLabel}.`,
  };
}

export function answerQuestion(input: {
  clientId: string;
  clientName: string;
  question: string;
  /** Human date the client's data runs through, e.g. "Jul 12". */
  throughLabel: string;
}): Answer {
  const authored = AUTHORED[input.clientId] ?? [];
  for (const candidate of authored) {
    if (candidate.match.some((rx) => rx.test(input.question))) {
      return candidate.answer;
    }
  }
  return missCard(input.clientId, input.clientName, input.throughLabel);
}
