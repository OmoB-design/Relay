import type { ReactNode } from "react";

/* ============================================================================
   Design-catalogue chrome. Internal tooling, not product surface.

   The point of these pages is a HANDSHAKE: every specimen carries a stable
   slug (`digest/absent`, `flags/dismissing`). Annotate a Figma frame with the
   same slug and the mapping back to code is unambiguous — no guessing which
   card is which, no re-deriving decisions per screen.

   These pages obey the same rule as product code: semantic tokens only, no
   arbitrary Tailwind values. The one exception is `font-mono`, Tailwind's
   built-in stack, used for slugs and token names — it is deliberately NOT a
   Relay type role, so it reads as tooling rather than product.
   ========================================================================== */

/** A stable identifier for one specimen. Quote this in Figma. */
export function Slug({ id }: { id: string }) {
  return (
    <code className="rounded-sm bg-paper px-1.5 py-0.5 font-mono text-12 text-ink-soft">
      {id}
    </code>
  );
}

/** One specimen: slug, what it is, when it appears, and the live render. */
export function Spec({
  id,
  title,
  when,
  note,
  onPaper,
  children,
}: {
  id: string;
  title: string;
  /** The condition that produces this state. The thing a designer must know. */
  when?: string;
  /** How to reach an internal state, or what to look at. */
  note?: string;
  /** Render on `paper` instead of `surface` — matches the app's own backdrop. */
  onPaper?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="scroll-mt-6 overflow-hidden rounded-lg border border-line bg-surface"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <span className="flex flex-wrap items-baseline gap-3">
          <Slug id={id} />
          <span className="font-ui text-14 text-ink">{title}</span>
        </span>
        {when && (
          <span className="font-ui text-12 text-ink-soft">{when}</span>
        )}
      </header>
      {note && (
        <p className="border-b border-line bg-flag-wash px-4 py-2 font-ui text-12 text-ink">
          {note}
        </p>
      )}
      <div className={onPaper ? "bg-paper p-6" : "p-6"}>{children}</div>
    </section>
  );
}

/** A titled run of specimens. */
export function Group({
  id,
  title,
  blurb,
  children,
}: {
  id: string;
  title: string;
  blurb?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-line pb-2">
        <h2 className="font-display text-22 text-ink">{title}</h2>
        {blurb && <p className="font-ui text-13 text-ink-soft">{blurb}</p>}
      </div>
      {children}
    </section>
  );
}

/** Page header shared by all three catalogues. */
export function CatalogueHeader({
  title,
  count,
  children,
}: {
  title: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      <p className="font-ui text-12 uppercase tracking-wide text-ink-soft">
        Relay design catalogue · {count}
      </p>
      <h1 className="font-display text-36 text-ink">{title}</h1>
      <p className="max-w-column font-ui text-14 text-ink-soft">{children}</p>
    </header>
  );
}

/** Two-column key/value table used for token listings. */
export function Rows({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="whitespace-nowrap px-4 py-2 text-left font-ui text-12 uppercase tracking-wide text-ink-soft"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({
  mono,
  children,
}: {
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <td
      className={
        mono
          ? "whitespace-nowrap px-4 py-2 font-mono text-12 text-ink"
          : "px-4 py-2 font-ui text-13 text-ink-soft"
      }
    >
      {children}
    </td>
  );
}
