/* Guards the three geometries Figma pins by measurement rather than by padding.
     npx tsx scripts/verify-figma-geometry.ts

   WHY THIS EXISTS. Each of these shipped wrong once, and none of the three was
   visible to tsc, to lint, to a build, or to a grep of the source — the classes
   were all present and correct-looking.

     1. DASHED OUTLINE. An <svg> is a replaced element. Given `inset` on all four
        sides but no explicit width or height it does not stretch: it takes the
        default 300x150 intrinsic size and drops the right/bottom offsets as
        over-constrained. Every dashed card in the app drew a fixed 300x150
        rectangle in its top-left corner — measured at 300x150 inside a 550x182
        panel — with the right and bottom edges either floating mid-card or
        clipped away by the host's overflow-hidden.

     2. DIGEST ROW. Figma aligns strokes to the inside of the box; CSS puts them
        outside it. The card's and the well's hairlines therefore added 2.8px the
        frame never spends, and the rows came out 64.8px and 72.8px against a
        frame that measures every one of them at 63px.

     3. BUTTON. Same cause, same 8px radius as the frame — but 28.4px tall
        instead of 26px, and an 8px radius reads squarer the taller the box gets.

   The fix in all three cases is to SET the dimension instead of deriving it, so
   this asserts that the dimension is still set. */
import { readFileSync } from "node:fs";

const fails: string[] = [];

function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) fails.push(detail ? `${label} — ${detail}` : label);
}

const css = readFileSync("app/globals.css", "utf8");
const outline = readFileSync("components/relay/DashedOutline.tsx", "utf8");
const button = readFileSync("components/ui/button.tsx", "utf8");
const band = readFileSync("components/relay/DailyDigestBand.tsx", "utf8");
const utils = readFileSync("lib/utils.ts", "utf8");

/* ---- 1. The dashed outline traces its host ------------------------------- */

const rule = css.match(/@utility hairline-outline \{([\s\S]*?)\n\}/);
check("globals.css declares the hairline-outline utility", Boolean(rule));
if (rule) {
  const body = rule[1];
  check(
    "hairline-outline sets an explicit width",
    /\bwidth:\s*calc\(/.test(body),
    "without a width the svg falls back to its 300px intrinsic size",
  );
  check(
    "hairline-outline sets an explicit height",
    /\bheight:\s*calc\(/.test(body),
    "without a height the svg falls back to its 150px intrinsic size",
  );
  check(
    "hairline-outline keeps the stroke's outer half visible",
    /overflow:\s*visible/.test(body),
    "the outer half of the stroke lies outside the svg viewport and is clipped without this",
  );
}

check(
  "DashedOutline uses hairline-outline",
  /hairline-outline/.test(outline),
);
check(
  "DashedOutline does not size its svg from offsets alone",
  // Comments stripped first: the header explains the `inset-hair-half` that
  // caused this, and quoting the bug must not read as committing it.
  !/\binset-(?!0\b)/.test(outline.replace(/\/\*[\s\S]*?\*\//g, "")),
  "an `inset-*` class on the svg reintroduces the 300x150 fallback",
);
check(
  "DashedOutline still strokes at 0.7px",
  /strokeWidth=\{0\.7\}/.test(outline),
  "Figma node 308:14153 specifies border-[0.7px]",
);

/* ---- 2. Digest rows are 63px, every variant ------------------------------ */

check(
  "globals.css pins the digest row to 63px",
  /--spacing-digest-row:\s*63px/.test(css),
);
check(
  "the digest row applies that height when closed",
  /!open && "h-digest-row"/.test(band),
  "the open row must still grow — the metric grid lives below the header",
);
check(
  "the problem row (absent / stale / not compiled) applies it too",
  /h-digest-row border-0/.test(band),
  "a row with no data is the same height as a row with data",
);
check(
  "the well fills the pinned height rather than fighting it",
  /cn\(PANEL, "flex-1/.test(band),
  "a fixed height plus a fixed bottom padding clips the content instead",
);

/* ---- 3. Buttons are 26px at radius 8 ------------------------------------- */

check(
  "globals.css pins the fig button to 26px",
  /--spacing-button-fig:\s*26px/.test(css),
);
const figSize = button.match(/\n\s*fig: "([^"]+)"/);
check("button.tsx still has a `fig` size", Boolean(figSize));
if (figSize) {
  check(
    "the fig button sets its height",
    figSize[1].includes("h-button-fig"),
    `got: ${figSize[1]}`,
  );
  check(
    "the fig button keeps radius 8 (Figma node 300:8781)",
    figSize[1].includes("rounded-8"),
    `got: ${figSize[1]}`,
  );
  check(
    "the fig button does not re-add vertical padding",
    !/\bpy-/.test(figSize[1]),
    "padding on top of a set height overflows the box it is meant to fill",
  );
}

/* ---- 4. The add-client tab check is not browser-only --------------------- */

const clientActions = readFileSync(
  "app/(app)/admin/clients/actions.ts",
  "utf8",
);
check(
  "the server verifies the tracker tab exists, not just the form",
  /listTrackerTabs\(\)/.test(clientActions) &&
    /has no tab called/.test(clientActions),
  "the form can be submitted before the workbook answers; only the server settles it",
);
const addForm = readFileSync("components/relay/AddClientForm.tsx", "utf8");
check(
  "the form refuses to submit while the check is still in flight",
  /tabState\.kind !== "checking"/.test(addForm),
  "otherwise a fast typist submits inside the window the check needs",
);

/* ---- 5. The Clients section header (node 447:2580) ------------------------ */

const sectionHeader = readFileSync("components/relay/SectionHeader.tsx", "utf8");
check(
  "the section title is H5 (23px), not Today's H6 (19px)",
  /text-fig-h5/.test(sectionHeader) && /font-greeting/.test(sectionHeader),
  "the two mastheads are different frames — a place, not a greeting",
);
check(
  "4px title to subline, 48px to the content below",
  /gap-1"/.test(sectionHeader) && /flex-col items-start gap-12/.test(sectionHeader),
  "the frame pins both; they are not the same spacing",
);
check(
  "fig-h5 is registered with tailwind-merge",
  /"fig-h5"/.test(utils),
  "an unregistered font size is silently deleted by cn — see verify-cn.ts",
);

/* The empty panel's body carries the frame's own line break. Figma draws it as
   two <p> lines; without whitespace-pre-line the \n is collapsed to a space and
   the sentence runs the full width of the well. */
/* Comments stripped: this file EXPLAINS max-w-column in prose, and a check that
   cannot tell an explanation from an application is worse than no check. */
const emptyPanel = readFileSync("components/relay/EmptyPanel.tsx", "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);
check(
  "the empty body honours a break the frame specifies",
  /whitespace-pre-line/.test(emptyPanel),
  "the \n in the copy would collapse to a space and the block would run wide",
);
check(
  "…and no longer uses the pre-redesign 720px column",
  !/max-w-column/.test(emptyPanel),
  "max-w-column is wider than the well, so it constrained nothing",
);

/* ---- 6. …and cn keeps all of it ------------------------------------------ */

check(
  "tailwind-merge is taught the named heights",
  /const HEIGHTS = \[[^\]]*"digest-row"[^\]]*"button-fig"/.test(utils) &&
    /\bh: \[\{ h: HEIGHTS \}\]/.test(utils),
  "an unregistered height is silently deleted by cn — see verify-cn.ts",
);

console.log(
  fails.length
    ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
    : "\n✓ outline, digest row, button and section header hold their geometry\n",
);
process.exit(fails.length ? 1 : 0);
