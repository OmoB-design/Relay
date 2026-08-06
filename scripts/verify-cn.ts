/* Proves `cn` does not silently delete a class.
     npx tsx scripts/verify-cn.ts

   WHY THIS EXISTS. tailwind-merge classifies `text-*` by looking the value up in
   its own table — `text-sm` is a size, `text-white` is a colour. A custom token it
   has never heard of is a coin flip, and it guessed wrong in both directions:

     text-primary-foreground text-fig-button  ->  text-fig-button    (colour lost)
     text-fig-caption-2      text-heading-05  ->  text-heading-05    (size lost)

   The first is why every filled button rendered with black inherited text instead
   of white. The second is why the absent-row chip rendered at body size. Neither
   showed up in a typecheck, a build, or a grep of the source — the classes were
   all there, they just never reached the DOM.

   lib/utils.ts registers the custom scales to fix it. This asserts the fix, so
   adding a font size or radius to @theme without registering it fails loudly. */
import { cn } from "../lib/utils";

type Case = {
  input: string[];
  /** Classes that must ALL survive. */
  keep?: string[];
  /** Exact expected output, for genuine conflicts where the last one should win. */
  exact?: string;
  label: string;
};

const CASES: Case[] = [
  // Filled buttons: the colour comes from `variant`, the size from `size`.
  {
    input: ["text-primary-foreground", "text-fig-button"],
    keep: ["text-primary-foreground", "text-fig-button"],
    label: "primary button keeps white text AND 12px",
  },
  {
    input: ["text-secondary-foreground", "text-fig-button"],
    keep: ["text-secondary-foreground", "text-fig-button"],
    label: "blue button keeps white text AND 12px",
  },
  {
    input: ["text-grey-100", "text-fig-body"],
    keep: ["text-grey-100", "text-fig-body"],
    label: "working/disabled keeps its text colour",
  },
  // Chips: size in the base string, colour in the conditional branch.
  {
    input: ["font-geist text-fig-caption-2", "bg-yellow-100 text-yellow-700"],
    keep: ["text-fig-caption-2", "text-yellow-700"],
    label: "amber chip keeps 10px AND amber",
  },
  {
    input: ["font-geist text-fig-caption-2", "text-heading-05"],
    keep: ["text-fig-caption-2", "text-heading-05"],
    label: "grey chip keeps 10px AND grey",
  },
  // Radius: the Button base must not fight the size's radius.
  {
    input: ["rounded-8", "rounded-6"],
    exact: "rounded-6",
    label: "two custom radii — the later wins",
  },
  {
    input: ["text-fig-body", "text-fig-caption-1"],
    exact: "text-fig-caption-1",
    label: "two custom sizes — the later wins",
  },
  {
    input: ["text-heading-01", "text-heading-06"],
    exact: "text-heading-06",
    label: "two custom colours — the later wins",
  },
  // Legacy scale, still live on the screens awaiting redesign.
  {
    input: ["text-16", "text-ink-soft"],
    keep: ["text-16", "text-ink-soft"],
    label: "legacy size survives a legacy colour",
  },
  // Border WIDTH must survive a border COLOUR — this was silently dropping, so
  // every card fell back to the browser default instead of the 0.7px hairline.
  {
    input: ["border-fig border-border"],
    keep: ["border-fig", "border-border"],
    label: "0.7px hairline survives its border colour",
  },
  {
    input: ["border-fig", "border-yellow-100"],
    keep: ["border-fig", "border-yellow-100"],
    label: "hairline survives an amber border colour",
  },
  {
    input: ["border-hair", "border-line"],
    keep: ["border-hair", "border-line"],
    label: "legacy 1.5px hairline survives its colour",
  },
  // Named font weights must not be eaten by a colour or size.
  {
    input: ["text-fig-body fig-w450", "text-heading-01"],
    keep: ["text-fig-body", "fig-w450", "text-heading-01"],
    label: "size + weight + colour all survive together",
  },
  // Shadows: a card's and a field's are both box-shadow, so the later must win.
  {
    input: ["shadow-card", "field-invalid"],
    exact: "field-invalid",
    label: "field spread replaces a card shadow",
  },
  {
    input: ["shadow-field", "shadow-control"],
    exact: "shadow-control",
    label: "two custom shadows — the later wins",
  },
  // The sidebar's account tile (Figma 357:2730) is a third box-shadow.
  {
    input: ["shadow-card", "shadow-nav-profile"],
    exact: "shadow-nav-profile",
    label: "the nav profile lift replaces a card shadow",
  },
  /* Caption 1 and Caption 1 - MD are the same 12px at different leading. If the
     -md suffix were read as a modifier of the shorter name, the nav label would
     silently take Caption 1's 1.4 and sit a pixel low in a 34px row. */
  {
    input: ["text-fig-caption-1-md", "text-heading-01"],
    keep: ["text-fig-caption-1-md", "text-heading-01"],
    label: "Caption 1 - MD survives its colour",
  },
  {
    input: ["text-fig-caption-1", "text-fig-caption-1-md"],
    exact: "text-fig-caption-1-md",
    label: "Caption 1 and Caption 1 - MD are distinct sizes",
  },
  // divider-t is a border WIDTH on one edge, and looks like a colour otherwise.
  {
    input: ["divider-t", "border-border"],
    keep: ["divider-t", "border-border"],
    label: "the mobile bar's top hairline survives its colour",
  },
  {
    input: ["divider-b", "divider-t"],
    keep: ["divider-b", "divider-t"],
    label: "top and bottom hairlines are different edges, not rivals",
  },
  /* Numbers/20, the due row's own card radius. Registered late, so this is the
     case that catches it being forgotten again. */
  {
    input: ["rounded-20", "border-fig", "border-border", "bg-surface-primary"],
    keep: ["rounded-20", "border-fig", "border-border", "bg-surface-primary"],
    label: "the due card keeps radius 20 with its hairline",
  },
  {
    input: ["rounded-18", "rounded-20"],
    exact: "rounded-20",
    label: "radius 18 and 20 are rivals — the later wins",
  },
  /* Named heights. `h-digest-row` and `h-button-fig` look like nothing at all to
     tailwind-merge unless declared — and a dropped height is exactly the bug
     they exist to prevent, since both boxes are pinned to a Figma measurement. */
  {
    input: ["h-digest-row", "border-0"],
    keep: ["h-digest-row", "border-0"],
    label: "the 63px digest row keeps its height next to a border reset",
  },
  {
    input: ["h-button-fig", "rounded-8", "px-2.5"],
    keep: ["h-button-fig", "rounded-8", "px-2.5"],
    label: "the 26px button keeps height, radius and padding together",
  },
  {
    input: ["h-button-fig", "h-9"],
    exact: "h-9",
    label: "a legacy height still overrides the named one",
  },
  // The shimmer utility sets a background; a bg-* colour beside it must not eat it.
  {
    input: ["shimmer", "rounded-4"],
    keep: ["shimmer", "rounded-4"],
    label: "the skeleton shimmer survives a radius",
  },
  // The real thing: a full Button class list.
  {
    input: [
      "inline-flex items-center gap-2 whitespace-nowrap",
      "border-fig border-border bg-secondary text-secondary-foreground shadow-control-sm",
      "gap-1.5 rounded-8 px-2.5 py-1.5 text-fig-button fig-medium",
    ],
    keep: [
      "bg-secondary",
      "text-secondary-foreground",
      "rounded-8",
      "px-2.5",
      "py-1.5",
      "text-fig-button",
      "fig-medium",
      "border-fig",
    ],
    label: "a whole blue Button survives intact",
  },
];

const fails: string[] = [];
for (const c of CASES) {
  const out = cn(...c.input);
  const parts = out.split(" ");
  let ok: boolean;
  if (c.exact !== undefined) {
    ok = out === c.exact;
  } else {
    const missing = (c.keep ?? []).filter((k) => !parts.includes(k));
    ok = missing.length === 0;
    if (!ok) fails.push(`${c.label} — dropped: ${missing.join(", ")}`);
  }
  if (c.exact !== undefined && !ok) {
    fails.push(`${c.label} — got "${out}", want "${c.exact}"`);
  }
  console.log(`  ${ok ? "✓" : "✗"} ${c.label}`);
  if (!ok) console.log(`      in : ${c.input.join(" | ")}\n      out: ${out}`);
}

console.log(
  fails.length
    ? `\n✗ ${fails.length} failure(s):\n${fails.map((f) => `   ${f}`).join("\n")}\n`
    : "\n✓ cn preserves every class it should — no silent drops\n",
);
process.exit(fails.length ? 1 : 0);
