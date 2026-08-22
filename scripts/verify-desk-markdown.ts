/* The desk transcript's markdown dialect — the parser's laws, held to.
 *
 *   npx tsx scripts/verify-desk-markdown.ts
 *
 * The renderer re-parses the WHOLE reply on every streamed chunk, so the
 * contract is stricter than "parses markdown": prefixes of valid markdown
 * must parse to something presentable (no raw ** or ### flashes), and the
 * source offsets that key the spans must be stable as text appends.
 */
import { emphasizeSpans, parseDeskMarkdown } from "../lib/desk-markdown";

type Check = { name: string; pass: boolean; got?: string };
const checks: Check[] = [];
const ok = (name: string, pass: boolean, got?: string) =>
  checks.push({ name, pass, got });

function flat(text: string) {
  return parseDeskMarkdown(text)
    .map((b) =>
      b.kind === "list"
        ? `${b.ordered ? "ol" : "ul"}[${b.items
            .map((i) => i.runs.map((r) => r.text).join(""))
            .join("|")}]`
        : `${b.kind}(${b.runs
            .map(
              (r) =>
                (r.bold ? "B" : "") +
                (r.italic ? "I" : "") +
                (r.code ? "C" : "") +
                `"${r.text}"`,
            )
            .join("+")})`,
    )
    .join(" ");
}

function main() {
  // Plain prose stays one paragraph — the deterministic engine's answers
  // and the greeting must render exactly as before.
  ok(
    "plain sentence is a single paragraph",
    flat("CPO held at $41 this week.") === 'p("CPO held at $41 this week.")',
    flat("CPO held at $41 this week."),
  );

  // Bold, closed and streaming-open.
  ok(
    "**bold** closes",
    flat("Spend is **$12,400** so far.") ===
      'p("Spend is "+B"$12,400"+" so far.")',
    flat("Spend is **$12,400** so far."),
  );
  ok(
    "unclosed ** styles forward, shows no marker",
    flat("Spend is **$12,4") === 'p("Spend is "+B"$12,4")',
    flat("Spend is **$12,4"),
  );

  // Headings, whole and mid-arrival.
  ok(
    "### heading",
    flat("### Pacing\nOn track.") === 'h("Pacing") p("On track.")',
    flat("### Pacing\nOn track."),
  );
  ok(
    "bare ### renders nothing yet",
    flat("###") === "",
    flat("###"),
  );

  // Lists — ordered merges, dash merges, blank line splits.
  ok(
    "ordered list groups",
    flat("1. Spend\n2. CPO\n3. ROAS") === "ol[Spend|CPO|ROAS]",
    flat("1. Spend\n2. CPO\n3. ROAS"),
  );
  ok(
    "dashed list groups",
    flat("- one\n- two") === "ul[one|two]",
    flat("- one\n- two"),
  );
  ok(
    "trailing bare '1.' renders nothing yet",
    flat("1.") === "" && flat("Spend held.\n1.") === 'p("Spend held.")',
    flat("Spend held.\n1."),
  );
  ok(
    "trailing bare '-' renders nothing yet",
    flat("- one\n-") === "ul[one]",
    flat("- one\n-"),
  );

  // Inline code chips.
  ok(
    "`code` run",
    flat("set `nc_roas` here") === 'p("set "+C"nc_roas"+" here")',
    flat("set `nc_roas` here"),
  );

  // Italic guard: arithmetic asterisks stay literal.
  ok(
    "3 * 4 stays arithmetic",
    flat("3 * 4 = 12") === 'p("3 * 4 = 12")',
    flat("3 * 4 = 12"),
  );

  // Single newline = line break inside ONE paragraph block.
  ok(
    "single newline keeps one paragraph",
    parseDeskMarkdown("line one\nline two").length === 1,
    String(parseDeskMarkdown("line one\nline two").length),
  );
  ok(
    "blank line makes two paragraphs",
    parseDeskMarkdown("para one\n\npara two").length === 2,
    String(parseDeskMarkdown("para one\n\npara two").length),
  );

  // THE STREAMING LAW: every run offset present in a prefix parse must map
  // to the same character of the source — offsets are span identity, and a
  // shifted offset would re-fade settled words.
  const fullText = "### Pacing\nSpend is **$12,400** through Jul 12.\n1. CPO **$41**\n2. ROAS 2.1";
  let stable = true;
  const offsetsAt = (t: string) => {
    const runs: { src: number; text: string }[] = [];
    for (const b of parseDeskMarkdown(t)) {
      if (b.kind === "list") b.items.forEach((i) => runs.push(...i.runs));
      else runs.push(...b.runs);
    }
    return runs;
  };
  for (let cut = 1; cut <= fullText.length; cut++) {
    for (const r of offsetsAt(fullText.slice(0, cut))) {
      if (fullText.slice(r.src, r.src + r.text.length) !== r.text) {
        stable = false;
        ok(
          `offset stability at cut ${cut}`,
          false,
          `run "${r.text}" claims src ${r.src} = "${fullText.slice(r.src, r.src + r.text.length)}"`,
        );
        break;
      }
    }
    if (!stable) break;
  }
  if (stable) ok("offsets stable across all stream prefixes", true);

  // THE EMPHASIS LAW: key spans are data, applied server-side, capped in
  // code. Verbatim or dropped; already-bold left alone; three at most.
  ok(
    "emphasizeSpans wraps the named figure and verdict",
    emphasizeSpans("CPO held at $41.20, under target this week.", [
      "$41.20",
      "under target",
    ]) === "CPO held at **$41.20**, **under target** this week.",
    emphasizeSpans("CPO held at $41.20, under target this week.", [
      "$41.20",
      "under target",
    ]),
  );
  ok(
    "a span not in the text is dropped, never guessed",
    emphasizeSpans("Spend ran $12.4k.", ["$99"]) === "Spend ran $12.4k.",
    emphasizeSpans("Spend ran $12.4k.", ["$99"]),
  );
  ok(
    "an already-bold span is left alone (no ****)",
    emphasizeSpans("ROAS hit **3.15** this week.", ["3.15"]) ===
      "ROAS hit **3.15** this week.",
    emphasizeSpans("ROAS hit **3.15** this week.", ["3.15"]),
  );
  ok(
    "the cap is three — a fourth span is ignored",
    emphasizeSpans("a1 b2 c3 d4", ["a1", "b2", "c3", "d4"]) ===
      "**a1** **b2** **c3** d4",
    emphasizeSpans("a1 b2 c3 d4", ["a1", "b2", "c3", "d4"]),
  );
  ok(
    "only the first occurrence carries the weight",
    emphasizeSpans("$41 today, $41 last week.", ["$41"]) ===
      "**$41** today, $41 last week.",
    emphasizeSpans("$41 today, $41 last week.", ["$41"]),
  );

  const failed = checks.filter((c) => !c.pass);
  for (const c of checks) {
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.pass ? "" : `  → ${c.got}`}`);
  }
  if (failed.length) {
    console.error(`\n${failed.length} failed`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} markdown checks pass.`);
}

main();
