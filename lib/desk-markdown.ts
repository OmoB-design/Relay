/* The desk transcript's markdown dialect — the parser, pure and shared by
   the renderer and its verify script.

   The stream re-parses the WHOLE reply on every chunk, so identity is the
   character's offset in the SOURCE string: every run records where its
   first character lives, the renderer keys spans by it, and chunk
   membership is derived from it — a settled word never re-fades.

   Tolerance is the other law. A chunk can end mid-marker: an unclosed **
   styles forward to its line's end (the closer usually lands two chunks
   later and simply confirms it), a bare "###" or "1." renders nothing
   until its content arrives. The reader never sees raw markdown flash.

   The dialect is deliberately the desk's subset: paragraphs, # headings,
   numbered and dashed lists, **bold**, *italic*, `code`. No tables, links,
   or nesting — the engine's FORMAT rules promise not to emit them. */

export type InlineRun = {
  /** Offset of the run's first character in the source string. */
  src: number;
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
};

export type ListItem = { src: number; runs: InlineRun[] };

export type DeskBlock =
  | { kind: "p"; src: number; runs: InlineRun[]; breaks: number[] }
  | { kind: "h"; src: number; runs: InlineRun[] }
  | {
      kind: "list";
      src: number;
      ordered: boolean;
      start: number;
      items: ListItem[];
    };

const HEADING = /^(#{1,4})\s+/;
const HEADING_BARE = /^#{1,4}\s*$/;
const ORDERED = /^(\d{1,3})[.)]\s+/;
const BULLET = /^[-*•]\s+/;
/* A marker the stream just started — "1." or "-" with nothing after it yet.
   Rendering it as a one-beat paragraph and then merging it into the list
   SHRINKS the transcript by a block (measured: a 16px down-up blip), so a
   trailing bare marker renders nothing until its content lands. */
const MARKER_PENDING = /^(\d{1,3}[.)]|[-*•])\s*$/;

/* Inline markers toggle as they're met, so a marker the stream hasn't closed
   yet already styles the text behind it — assumed closure, no ** flash. */
function parseInline(line: string, base: number): InlineRun[] {
  const runs: InlineRun[] = [];
  let bold = false;
  let italic = false;
  let code = false;
  let buf = "";
  let bufSrc = 0;
  const flush = () => {
    if (buf) runs.push({ src: bufSrc, text: buf, bold, italic, code });
    buf = "";
  };
  let i = 0;
  while (i < line.length) {
    if (!code && line.startsWith("**", i)) {
      flush();
      bold = !bold;
      i += 2;
      continue;
    }
    /* Single * is italic only against a word edge — "3 * 4" stays arithmetic. */
    if (
      !code &&
      line[i] === "*" &&
      (italic ? line[i - 1] !== " " : line[i + 1] !== " " && i + 1 < line.length)
    ) {
      flush();
      italic = !italic;
      i += 1;
      continue;
    }
    if (line[i] === "`") {
      flush();
      code = !code;
      i += 1;
      continue;
    }
    if (!buf) bufSrc = base + i;
    buf += line[i];
    i += 1;
  }
  flush();
  return runs;
}

export function parseDeskMarkdown(text: string): DeskBlock[] {
  const blocks: DeskBlock[] = [];
  let para: Extract<DeskBlock, { kind: "p" }> | null = null;
  let list: Extract<DeskBlock, { kind: "list" }> | null = null;
  const settle = () => {
    para = null;
    list = null;
  };

  let offset = 0;
  const lines = text.split("\n");
  for (let n = 0; n < lines.length; n++) {
    const rawLine = lines[n];
    const src = offset;
    offset += rawLine.length + 1;

    const lead = rawLine.length - rawLine.trimStart().length;
    const line = rawLine.slice(lead);
    const at = src + lead;

    if (!line) {
      settle();
      continue;
    }

    if (n === lines.length - 1 && MARKER_PENDING.test(line)) continue;

    const h = line.match(HEADING);
    if (h || HEADING_BARE.test(line)) {
      settle();
      if (!h) continue; // bare "#": its text hasn't streamed in yet
      blocks.push({
        kind: "h",
        src,
        runs: parseInline(line.slice(h[0].length), at + h[0].length),
      });
      continue;
    }

    const ord = line.match(ORDERED);
    const bul = ord ? null : line.match(BULLET);
    if (ord || bul) {
      para = null;
      const marker = (ord ?? bul)![0];
      const item: ListItem = {
        src,
        runs: parseInline(line.slice(marker.length), at + marker.length),
      };
      if (list && list.ordered === Boolean(ord)) {
        list.items.push(item);
      } else {
        list = {
          kind: "list",
          src,
          ordered: Boolean(ord),
          start: ord ? parseInt(ord[1], 10) : 1,
          items: [item],
        };
        blocks.push(list);
      }
      continue;
    }

    list = null;
    const runs = parseInline(line, at);
    if (para) {
      para.breaks.push(runs[0]?.src ?? at);
      para.runs.push(...runs);
    } else {
      para = { kind: "p", src, runs, breaks: [] };
      blocks.push(para);
    }
  }
  return blocks;
}

/** The reply as a screen reader should hear it — structure, no syntax. */
export function deskMarkdownToPlain(text: string): string {
  return parseDeskMarkdown(text)
    .map((b) =>
      b.kind === "list"
        ? b.items
            .map(
              (i, n) =>
                `${b.ordered ? `${b.start + n}.` : "–"} ${i.runs
                  .map((r) => r.text)
                  .join("")}`,
            )
            .join("\n")
        : b.runs.map((r) => r.text).join(""),
    )
    .join("\n");
}
