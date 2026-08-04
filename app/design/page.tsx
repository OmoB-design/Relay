import Link from "next/link";
import { CatalogueHeader, Slug } from "@/app/design/_ui";
import { SCREENS, stateCount } from "@/lib/design/screens";

/* The catalogue index. Explains the handshake so the three pages below are
   usable without me in the room. */

const PAGES: {
  href: string;
  title: string;
  count: string;
  what: string;
  use: string;
}[] = [
  {
    href: "/design/tokens",
    title: "Tokens",
    count: "11 colours · 3 type roles · 8 sizes · 5 radii",
    what: "Every design value in Relay, with the hex to paste into Figma and the variable name to give it.",
    use: "Build the Figma variable set from this page first. It is the layer that makes every other screen cheap.",
  },
  {
    href: "/design/components",
    title: "Components",
    count: "29 Relay · 12 shadcn",
    what: "Every component rendered live with all its variants. Six screen-level compositions link to their real routes.",
    use: "One Figma component per specimen, with variants matching the states shown.",
  },
  {
    href: "/design/states/today",
    title: "Today — every state",
    count: "28 frames",
    what: "Today has four sections and each has its own absence and progress states. This is the full matrix, not the happy path.",
    use: "One Figma frame per slug. A design covering only the populated state will break the first late morning.",
  },
];

/** The other five screens, driven by lib/design/screens.ts. */
const SCREEN_TOTAL = SCREENS.reduce((n, s) => n + stateCount(s), 0);

export default function DesignIndexPage() {
  return (
    <>
      <CatalogueHeader title="Design catalogue" count="index">
        Everything needed to redesign Relay in Figma without losing behaviour.
        Three pages: the token contract, the component inventory, and the full
        state matrix for Today.
      </CatalogueHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        {PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5 hover:border-verdigris"
          >
            <span className="font-display text-22 text-ink">{p.title}</span>
            <span className="font-ui text-12 text-ink-soft">{p.count}</span>
            <span className="font-ui text-13 text-ink">{p.what}</span>
            <span className="mt-auto pt-2 font-ui text-12 text-verdigris">
              {p.use}
            </span>
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-display text-22 text-ink">The handshake</h2>
        <p className="max-w-column font-ui text-14 text-ink-soft">
          Every specimen carries a stable slug, shown in a grey monospace chip:
        </p>
        <div className="flex flex-wrap gap-2">
          <Slug id="digest/absent" />
          <Slug id="flags/dismissing" />
          <Slug id="EvidenceCard/linked" />
          <Slug id="ui/button" />
        </div>
        <p className="max-w-column font-ui text-14 text-ink-soft">
          Name the corresponding Figma frame or component with the same slug.
          That single convention is what turns the second, third, and fourth
          screen into mechanical work — no guessing which card is which, and no
          re-deriving a decision that was already made on an earlier screen.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-display text-22 text-ink">What Figma should own</h2>
        <div className="flex flex-col gap-3 font-ui text-14 text-ink-soft">
          <p className="max-w-column">
            <span className="text-ink">Yours to change:</span> colour, type,
            radius, spacing, elevation, layout, iconography, and the visual
            treatment of every card, chip, and row.
          </p>
          <p className="max-w-column">
            <span className="text-ink">Not visual, so it survives:</span> the
            domain model, the data seam, the server actions, route structure,
            heading semantics, aria labels, and every piece of copy — copy lives
            in <span className="font-mono text-13">lib/config.ts</span>, so
            rewording is a config edit, not a component hunt.
          </p>
          <p className="max-w-column">
            <span className="text-ink">
              Needs a decision before it changes:
            </span>{" "}
            the three reserved colour roles on the Tokens page. Colour carries
            meaning in Relay — the dotted claim underline reads as a signal only
            because verdigris means one thing. If a redesign introduces a new
            colour, give it a role first.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-22 text-ink">
            The other five screens
          </h2>
          <span className="font-ui text-12 text-ink-soft">
            {SCREEN_TOTAL} frames · {28 + SCREEN_TOTAL} across the whole app
          </span>
        </div>
        <p className="max-w-column font-ui text-14 text-ink-soft">
          Each is a state matrix rather than live specimens: these are
          screen-level compositions, and nearly every state they can be in is
          internal — a selected claim, an open editor, a chosen filter. Every
          state names its condition and how to reach it on the real route.
        </p>
        <div className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line">
          {SCREENS.map((sc) => (
            <Link
              key={sc.key}
              href={`/design/states/${sc.key}`}
              className="flex flex-col gap-1 px-4 py-3 hover:bg-paper"
            >
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-ui text-14 text-ink">{sc.title}</span>
                <span className="font-ui text-12 text-ink-soft">
                  {stateCount(sc)} frames
                </span>
              </span>
              <span className="max-w-column font-ui text-13 text-ink-soft">
                {sc.blurb}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
