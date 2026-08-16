import { CatalogueHeader, Cell, Group, Rows, Slug } from "@/app/design/_ui";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";

/* ============================================================================
   Token catalogue — the complete design contract.

   app/globals.css is the SOURCE OF TRUTH. The hex values are restated here so
   they can be copied into Figma; if the two ever disagree, globals.css wins.

   The `figma` column is the ask: name the Figma variable exactly that, and the
   swap becomes a mechanical rename instead of a judgement call per component.
   ========================================================================== */

type ColorToken = {
  token: string;
  swatch: string;
  hex: string;
  figma: string;
  role: string;
  /** What breaks if this colour is used for anything else. */
  reserved?: string;
};

const COLORS: ColorToken[] = [
  {
    token: "paper",
    swatch: "bg-paper",
    hex: "#f4f6f5",
    figma: "paper",
    role: "App background — cool porcelain, not cream",
  },
  {
    token: "surface",
    swatch: "bg-surface",
    hex: "#ffffff",
    figma: "surface",
    role: "Cards, panels, list backgrounds",
  },
  {
    token: "ink",
    swatch: "bg-ink",
    hex: "#17201c",
    figma: "ink",
    role: "Primary text, filled dark states",
  },
  {
    token: "ink-soft",
    swatch: "bg-ink-soft",
    hex: "#5a665f",
    figma: "ink-soft",
    role: "Secondary text, labels, metadata",
  },
  {
    token: "line",
    swatch: "bg-line",
    hex: "#e3e7e4",
    figma: "line",
    role: "Borders, dividers, hairlines",
  },
  {
    token: "verdigris",
    swatch: "bg-verdigris",
    hex: "#146b54",
    figma: "accent",
    role: "Evidence, primary action, sent/complete",
    reserved:
      "Reserved. The evidence affordance (dotted claim underline) reads as a signal only because this colour means nothing else. Decorative use kills it.",
  },
  {
    token: "verdigris-wash",
    swatch: "bg-verdigris-wash",
    hex: "#ddede6",
    figma: "accent-wash",
    role: "Evidence highlight, selected nav, secondary button fill",
  },
  {
    token: "flag",
    swatch: "bg-flag",
    hex: "#a16207",
    figma: "attention",
    role: "Flags, warnings, constraints, demo-clock banner",
    reserved:
      "Reserved for things the buyer must look at but that are not errors.",
  },
  {
    token: "flag-wash",
    swatch: "bg-flag-wash",
    hex: "#f6edda",
    figma: "attention-wash",
    role: "Flag card background",
  },
  {
    token: "negative",
    swatch: "bg-negative",
    hex: "#9b3a2e",
    figma: "negative",
    role: "Negative deltas, validation errors, destructive actions",
    reserved:
      "Reserved for wrong-direction numbers and blocked submits. Today this is the only validation colour in the app.",
  },
  {
    token: "white",
    swatch: "bg-white",
    hex: "#ffffff",
    figma: "on-accent",
    role: "Foreground on accent/negative fills",
  },
];

/** shadcn primitives never own a hex — they consume these aliases. Redesigning
 *  a Button means changing what `--color-primary` points at, nothing else. */
const ALIASES: { shadcn: string; relay: string; where: string }[] = [
  { shadcn: "--color-background", relay: "paper", where: "page background" },
  { shadcn: "--color-foreground", relay: "ink", where: "body text" },
  { shadcn: "--color-card", relay: "surface", where: "Card, Dialog, Sheet" },
  { shadcn: "--color-popover", relay: "surface", where: "DropdownMenu, Tooltip" },
  { shadcn: "--color-primary", relay: "verdigris", where: "Button default, Badge default" },
  { shadcn: "--color-primary-foreground", relay: "white", where: "text on primary" },
  { shadcn: "--color-secondary", relay: "verdigris-wash", where: "Button secondary" },
  { shadcn: "--color-secondary-foreground", relay: "verdigris", where: "text on secondary" },
  { shadcn: "--color-muted", relay: "paper", where: "Skeleton, muted fills" },
  { shadcn: "--color-muted-foreground", relay: "ink-soft", where: "placeholder text" },
  { shadcn: "--color-accent", relay: "verdigris-wash", where: "hover states" },
  { shadcn: "--color-accent-foreground", relay: "verdigris", where: "text on hover" },
  { shadcn: "--color-destructive", relay: "negative", where: "Button destructive" },
  { shadcn: "--color-border", relay: "line", where: "every border" },
  { shadcn: "--color-input", relay: "line", where: "Input, Textarea border" },
  { shadcn: "--color-ring", relay: "verdigris", where: "focus ring" },
];

const TYPE_ROLES: {
  token: string;
  face: string;
  className: string;
  use: string;
  sample: string;
  sampleClass: string;
}[] = [
  {
    token: "font-display",
    face: "Fraunces (serif)",
    className: "font-display",
    use: "Client names, page titles, evidence values. Anything factual and weighty.",
    sample: "Northbrook · $26.40",
    sampleClass: "font-display text-28",
  },
  {
    token: "font-narrative",
    face: "Newsreader (serif)",
    className: "font-narrative",
    use: "Draft prose ONLY. Never chrome. This is what makes a draft read like writing rather than a form field.",
    sample:
      "Cost per order held at $26.40 — about 9% under our $29 line — even with the extra budget.",
    sampleClass: "font-narrative text-18",
  },
  {
    token: "font-ui",
    face: "Archivo (sans)",
    className: "font-ui",
    use: "All chrome: buttons, labels, metadata, section headings, nav.",
    sample: "Mark reviewed · Copy for Slack · as of Jul 12, 11:59pm",
    sampleClass: "font-ui text-14",
  },
];

const SCALE: { token: string; px: string; lh: string; use: string; cls: string }[] = [
  { token: "text-12", px: "12px", lh: "1.4", use: "Micro-metadata, chips, captions", cls: "text-12" },
  { token: "text-13", px: "13px", lh: "1.4", use: "Section headings (uppercase), secondary lines", cls: "text-13" },
  { token: "text-14", px: "14px", lh: "1.5", use: "UI base — buttons, body chrome", cls: "text-14" },
  { token: "text-16", px: "16px", lh: "1.5", use: "Client names in lists", cls: "text-16" },
  { token: "text-18", px: "18px", lh: "1.65", use: "Narrative body — the loose leading is deliberate", cls: "text-18" },
  { token: "text-22", px: "22px", lh: "1.35", use: "Sub-headings, catalogue group titles", cls: "text-22" },
  { token: "text-28", px: "28px", lh: "1.2", use: "Page h1 (Today greeting)", cls: "text-28" },
  { token: "text-36", px: "36px", lh: "1.1", use: "Hero display", cls: "text-36" },
];

const RADII: { token: string; px: string; use: string; cls: string }[] = [
  { token: "rounded-sm", px: "6px", use: "Small chips, inline code", cls: "rounded-sm" },
  { token: "rounded-md", px: "8px", use: "Buttons, inputs, textareas", cls: "rounded-md" },
  { token: "rounded-lg", px: "10px", use: "Cards, dialogs, list containers", cls: "rounded-lg" },
  { token: "rounded-xl", px: "12px", use: "Large panels", cls: "rounded-xl" },
  { token: "rounded-full", px: "999px", use: "Pills, status chips, avatars", cls: "rounded-full" },
];

const SIZES: { token: string; value: string; use: string }[] = [
  { token: "--spacing-rule", value: "3px", use: "The linked-evidence left rule in the split view" },
  { token: "--container-column", value: "720px", use: "Today and general centered reading column (max-w-column)" },
  { token: "--container-thread", value: "680px", use: "Answer Desk thread width (max-w-thread)" },
  { token: "--spacing-dialog-cap", value: "85svh", use: "Scrollable dialog height cap (snapshot viewer)" },
];

export default function TokensPage() {
  return (
    <>
      <CatalogueHeader title="Tokens" count="1 of 3">
        Every design value in Relay. Components reference these by name only — no
        component anywhere holds a hex, a font family, or a design px. Change a
        row here and every screen follows. The <strong>figma</strong> column is
        the name to use for the corresponding Figma variable.
      </CatalogueHeader>

      <Group
        id="colour"
        title="Colour"
        blurb="Eleven tokens. Three of them carry meaning that other parts of the app depend on — those are marked reserved."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {COLORS.map((c) => (
            <div
              key={c.token}
              className="flex gap-3 rounded-lg border border-line bg-surface p-4"
            >
              <span
                className={`h-14 w-14 shrink-0 rounded-md border border-line ${c.swatch}`}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-2">
                  <Slug id={c.token} />
                  <span className="font-mono text-12 text-ink-soft">{c.hex}</span>
                </span>
                <span className="mt-1 block font-ui text-13 text-ink">
                  {c.role}
                </span>
                <span className="mt-1 block font-ui text-12 text-ink-soft">
                  figma: <span className="font-mono">{c.figma}</span>
                </span>
                {c.reserved && (
                  <span className="mt-2 block rounded-md bg-flag-wash px-2 py-1 font-ui text-12 text-ink">
                    {c.reserved}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </Group>

      <Group
        id="aliases"
        title="shadcn aliases"
        blurb="The 12 shadcn primitives consume these names, so they can never introduce a colour of their own. This is why restyling a Button is a token edit, not a component fork."
      >
        <Rows head={["shadcn variable", "→ Relay token", "Drives"]}>
          {ALIASES.map((a) => (
            <tr key={a.shadcn} className="border-b border-line last:border-0">
              <Cell mono>{a.shadcn}</Cell>
              <Cell mono>{a.relay}</Cell>
              <Cell>{a.where}</Cell>
            </tr>
          ))}
        </Rows>
      </Group>

      <Group
        id="type-roles"
        title="Type — three roles, three faces"
        blurb="The roles are semantic, not decorative. A serif on a button, or the UI sans on draft prose, changes what the interface claims about itself."
      >
        <div className="flex flex-col gap-4">
          {TYPE_ROLES.map((r) => (
            <div key={r.token} className="rounded-lg border border-line bg-surface p-6">
              <div className="flex flex-wrap items-baseline gap-3">
                <Slug id={r.token} />
                <span className="font-ui text-13 text-ink">{r.face}</span>
              </div>
              <p className={`mt-3 text-ink ${r.sampleClass}`}>{r.sample}</p>
              <p className="mt-3 max-w-column font-ui text-12 text-ink-soft">
                {r.use}
              </p>
            </div>
          ))}
        </div>
      </Group>

      <Group
        id="type-scale"
        title="Type scale"
        blurb="Eight steps. Line-height is bound to the step, so a size change carries its leading with it."
      >
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          {SCALE.map((s) => (
            <div
              key={s.token}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3"
            >
              <span className="w-24 shrink-0">
                <Slug id={s.token} />
              </span>
              <span className="w-28 shrink-0 font-mono text-12 text-ink-soft">
                {s.px} / {s.lh}
              </span>
              <span className={`font-ui text-ink ${s.cls}`}>
                The quick brown fox
              </span>
              <span className="w-full font-ui text-12 text-ink-soft">{s.use}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group
        id="radius"
        title="Radius"
        blurb="Five steps. shadcn's rounded-md / rounded-lg are re-based onto these, so primitives and Relay components agree."
      >
        <div className="flex flex-wrap gap-4">
          {RADII.map((r) => (
            <div key={r.token} className="flex flex-col gap-2">
              <span
                className={`flex h-20 w-32 items-center justify-center border border-line bg-verdigris-wash font-mono text-12 text-verdigris ${r.cls}`}
              >
                {r.px}
              </span>
              <Slug id={r.token} />
              <span className="w-32 font-ui text-12 text-ink-soft">{r.use}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group
        id="sizing"
        title="Named sizes"
        blurb="Semantic, so they survive a redesign. A reading column stays a reading column even if the number changes."
      >
        <Rows head={["Token", "Value", "Purpose"]}>
          {SIZES.map((s) => (
            <tr key={s.token} className="border-b border-line last:border-0">
              <Cell mono>{s.token}</Cell>
              <Cell mono>{s.value}</Cell>
              <Cell>{s.use}</Cell>
            </tr>
          ))}
        </Rows>
      </Group>

      <Group
        id="elevation"
        title="Elevation & focus"
        blurb="Borders over shadows — one shadow token in the entire system. The focus ring is a hard accessibility requirement, not a style choice."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface p-6">
            <Slug id="shadow-raised" />
            <div className="mt-3 rounded-lg bg-surface p-4 shadow-raised">
              <p className="font-ui text-13 text-ink">
                0 1px 3px rgb(23 32 28 / 0.07)
              </p>
            </div>
            <p className="mt-3 font-ui text-12 text-ink-soft">
              The only shadow. Everything else separates with{" "}
              <span className="font-mono">border-line</span>.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6">
            <Slug id="focus-ring" />
            <p className="mt-3 font-ui text-12 text-ink-soft">
              2px verdigris outline, offset 2. Tab into the button to see it.
            </p>
            <div className="mt-3">
              <Button size="sm" variant="outline">
                Tab to me
              </Button>
            </div>
          </div>
        </div>
      </Group>

      <Group
        id="utilities"
        title="Custom utilities"
        blurb="Three design values that needed names rather than inline numbers. All three are part of the evidence system."
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-line bg-surface p-6">
            <Slug id="border-hair" />
            <div className="mt-3 border-hair border-dashed border-line p-4">
              <p className="font-ui text-13 text-ink-soft">
                1.5px — empty-state outlines, absent-row rows
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6">
            <Slug id="claim-underline" />
            <p className="mt-3 font-narrative text-18 text-ink">
              A fact claim reads like prose but{" "}
              <span className="claim-underline">
                carries a dotted verdigris underline
              </span>{" "}
              — the affordance that says &ldquo;a number sits behind this
              sentence.&rdquo;
            </p>
            <p className="mt-4 font-narrative text-18 text-ink">
              On hover or selection it strengthens:{" "}
              <span className="claim-underline-strong">
                claim-underline-strong
              </span>
              .
            </p>
            <p className="mt-3 font-ui text-12 text-ink-soft">
              Border-bottom, not text-decoration, so the dots stay even under a
              span that wraps across lines.
            </p>
          </div>
        </div>
      </Group>

      <Group
        id="motion"
        title="Motion"
        blurb="Two durations, both from lib/config.ts. Everything collapses to ~0 under prefers-reduced-motion."
      >
        <Rows head={["Token", "Value", "Use"]}>
          <tr className="border-b border-line">
            <Cell mono>motion.fast</Cell>
            <Cell mono>{config.motion.fast}ms</Cell>
            <Cell>Hover, chip, and highlight transitions</Cell>
          </tr>
          <tr>
            <Cell mono>motion.base</Cell>
            <Cell mono>{config.motion.base}ms</Cell>
            <Cell>Panel reveals, evidence stitch, layout shifts</Cell>
          </tr>
        </Rows>
      </Group>
    </>
  );
}
