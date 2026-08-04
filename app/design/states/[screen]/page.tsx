import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogueHeader, Group, Slug } from "@/app/design/_ui";
import { SCREENS, screenByKey, stateCount } from "@/lib/design/screens";

/* One page per screen, driven by the matrices in lib/design/screens.ts.

   `today` has its own static page at ../today, which renders live specimens
   because its props are small. Next resolves that static segment before this
   dynamic one, so the two coexist. */

export function generateStaticParams() {
  return SCREENS.map((s) => ({ screen: s.key }));
}

export default function ScreenStatesPage({
  params,
}: {
  params: { screen: string };
}) {
  const spec = screenByKey(params.screen);
  if (!spec) notFound();

  const total = stateCount(spec);
  const index = SCREENS.findIndex((s) => s.key === spec.key);
  const next = SCREENS[index + 1];

  return (
    <>
      <CatalogueHeader title={spec.title} count={`${total} frames`}>
        {spec.blurb}
      </CatalogueHeader>

      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-ui text-13 uppercase tracking-wide text-ink-soft">
            Coverage checklist — {total} frames
          </h2>
          <Link
            href={spec.href}
            className="font-ui text-13 text-verdigris hover:underline"
          >
            Open the live screen →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {spec.groups.flatMap((g) =>
            g.states.map((s) => (
              <a key={s.slug} href={`#${s.slug}`}>
                <Slug id={s.slug} />
              </a>
            )),
          )}
        </div>
        <p className="max-w-column font-ui text-12 text-ink-soft">
          Name each Figma frame with its slug and the mapping back to code needs
          no interpretation. This screen is not ready to redesign until every
          slug has a frame — designing only the populated state is how you ship
          something that breaks the first morning the tracker is late.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-ui text-13 uppercase tracking-wide text-ink-soft">
          Built from
        </h2>
        <div className="flex flex-wrap gap-2">
          {spec.builtFrom.map((c) => (
            <Link key={c} href={`/design/components#${c}`}>
              <Slug id={c} />
            </Link>
          ))}
        </div>
        <p className="max-w-column font-ui text-12 text-ink-soft">
          Each of these is already rendered live, with every variant, on the
          components page. Redesign the components and most of this screen
          follows.
        </p>
      </div>

      {spec.groups.map((group) => (
        <Group
          key={group.title}
          id={group.title}
          title={group.title}
          blurb={group.blurb}
        >
          <div className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {group.states.map((s) => (
              <div
                key={s.slug}
                id={s.slug}
                className="scroll-mt-6 flex flex-col gap-1.5 px-4 py-4"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <Slug id={s.slug} />
                  <span className="font-ui text-14 text-ink">{s.title}</span>
                  {s.collapses && (
                    <span className="rounded-full bg-flag-wash px-2 py-0.5 font-ui text-12 text-ink">
                      renders nothing — design the gap
                    </span>
                  )}
                </div>
                <p className="max-w-column font-ui text-13 text-ink-soft">
                  {s.when}
                </p>
                {s.reach && (
                  <p className="max-w-column font-ui text-12 text-ink-soft">
                    Reach it: <span className="text-ink">{s.reach}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </Group>
      ))}

      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-display text-22 text-ink">
          Why these are not live specimens
        </h2>
        <p className="max-w-column font-ui text-14 text-ink-soft">
          Today&apos;s frames render the real components because their props are
          small. These five are screen-level compositions whose props are whole
          data contexts, and nearly every state they can be in is{" "}
          <em>internal</em> — a selected claim, an open editor, a chosen filter,
          a picked tone. Fabricating a context would not surface those anyway;
          you would still have to click. So each state names itself, states its
          condition, and tells you how to reach it on{" "}
          <Link href={spec.href} className="text-verdigris hover:underline">
            the real screen
          </Link>
          , which already runs on real data.
        </p>
        {next && (
          <p className="font-ui text-14 text-ink-soft">
            Next screen:{" "}
            <Link
              href={`/design/states/${next.key}`}
              className="text-verdigris hover:underline"
            >
              {next.title}
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
