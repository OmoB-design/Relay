import { cn } from "@/lib/utils";

/* ============================================================================
   Loading skeletons, sized from the real frames rather than from a generic list.

   A skeleton earns its keep by being the same shape as what replaces it. If the
   placeholder card is 8px shorter than the real one, the page jumps at the
   moment the content lands — which is the exact moment the reader started
   reading. So every measurement below is lifted from the component it stands in
   for: the same rounded-18 shell, the same rounded-14 well, the same p-1 gap
   between them, the same px-2 pb-3 pt-1.5 row.

   Bar heights track TYPE SIZE, not line-height: a 13px name gets h-3.5, a 12px
   question h-3, a 10px age h-2.5.

   The shimmer itself is a single utility driven by CSS variables — see the
   `shimmer` block in globals.css. /design/skeletons has a live tweak panel for
   those variables.
   ========================================================================== */

/** One shimmering block. Everything here is made of these. */
export function Bar({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("block shimmer rounded-4", className)} />
  );
}

/** Section heading: 14px glyph, a 13px label, and the rule to the edge. */
export function SectionHeadingSkeleton({ withGlyph = false }: { withGlyph?: boolean }) {
  return (
    <div className="flex w-full items-center gap-4">
      <span className="flex shrink-0 items-center gap-1.5">
        {withGlyph && <Bar className="size-nav-icon rounded-full" />}
        <Bar className="h-3.5 w-28" />
      </span>
      <span aria-hidden="true" className="h-0 min-w-px flex-1 divider-b border-border" />
    </div>
  );
}

/** The card shape shared by the digest band, Waiting and Due: a white shell
 *  wrapping a single inset well. */
function CardWell({
  children,
  fill = "bg-surface-dashboard",
}: {
  children: React.ReactNode;
  fill?: string;
}) {
  return (
    <div className="rounded-18 border-fig border-border bg-surface-primary p-1 shadow-card">
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-14 border-fig border-border",
          fill,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Yesterday's numbers. Rows carry the 34px client mark.
 *
 *  Mirrors DailyDigestBand's list rather than CardWell: the band is one 63px
 *  card PER ROW at gap-2 with a hairline between, not a single well holding
 *  several rows. Sharing the shell would have the page resize under the reader
 *  the moment the data lands, which is the one thing a skeleton exists to
 *  prevent. */
export function DigestSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeadingSkeleton />
      <ul className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex flex-col gap-2">
            {i > 0 && (
              <span
                aria-hidden="true"
                className="h-0 w-full divider-b border-border"
              />
            )}
            <div className="flex h-digest-row flex-col overflow-hidden rounded-18 border-fig border-border bg-surface-primary p-1 shadow-card">
              {/* Same two shells as the real row: the well fills the pinned
                  height, the header sits at its top with the slack below. */}
              <div className="flex flex-1 flex-col overflow-hidden rounded-14 border-fig border-border bg-surface-dashboard pt-1">
                <div className="flex items-center gap-2 px-2">
                  <Bar className="size-avatar shrink-0 rounded-10" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Bar className="h-3.5 w-28" />
                    <Bar className="h-3 w-full max-w-80" />
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Waiting on you — mirrors WaitingList row for row. */
export function WaitingSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeadingSkeleton withGlyph />
      <CardWell>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between gap-4 px-2 pb-3 pt-1.5",
              i < rows - 1 && "divider-b border-border",
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Bar className="h-3.5 w-24" />
              <Bar className="h-3 w-full max-w-96" />
            </span>
            <Bar className="h-2.5 w-14 shrink-0" />
          </div>
        ))}
      </CardWell>
    </section>
  );
}

/** Due this week. Each row is its OWN radius-20 card with 16px under it — not
 *  rows in a shared well like Waiting — and it opens with the 35px client ring
 *  and ends in a button, so the right-hand block carries the button's radius. */
export function DueSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeadingSkeleton />
      <div className="flex flex-col gap-4 pt-0.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-20 border-fig border-border bg-surface-primary"
          >
            <div className="flex items-center gap-2.5 p-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Bar className="size-ring shrink-0 rounded-full" />
                <span className="flex min-w-0 flex-col gap-1.5">
                  <Bar className="h-3.5 w-28" />
                  <Bar className="h-3 w-48" />
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Bar className="h-3 w-14" />
                <Bar className="h-7 w-24 rounded-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The sidebar, at whichever width it is currently set to. */
export function NavSkeleton({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-between bg-surface-foreground-01 py-2",
        collapsed ? "w-nav-collapsed" : "w-nav",
      )}
    >
      <div className="flex w-full flex-col items-center">
        <div
          className={cn(
            "flex h-nav-header w-full items-center px-2 pb-2 pt-2.5",
            collapsed ? "flex-col justify-center" : "justify-between",
          )}
        >
          <Bar className="size-nav-mark rounded-6" />
          {!collapsed && <Bar className="size-nav-icon rounded-4" />}
        </div>
        <div className={cn("flex w-full flex-col gap-0.5 px-2", collapsed && "items-center")}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "flex items-center gap-1.5 rounded-10 p-2",
                collapsed ? "shrink-0" : "w-full",
              )}
            >
              <Bar className="size-nav-icon rounded-4" />
              {!collapsed && <Bar className="h-3 w-20" />}
            </span>
          ))}
        </div>
      </div>
      <div className="w-full px-2">
        <Bar className={cn("h-8 rounded-10", collapsed ? "w-8" : "w-full")} />
      </div>
    </div>
  );
}

/** The whole Today page, header included.
 *
 *  The wrapper here MIRRORS app/(app)/today/page.tsx exactly — same 550 column,
 *  same px-6 pt-8 outside it, same pt-16 pb-8 gap-16 inside. It drifted once
 *  already: the page moved to the sheet's 550 and this stayed on the legacy 720,
 *  so the skeleton was visibly wider than what replaced it. If one changes, both
 *  change. */
export function TodaySkeleton() {
  return (
    <div className="flex flex-col items-center px-6 pt-8">
      <div className="flex w-full max-w-sheet flex-col gap-16 pb-8 pt-16">
        {/* The masthead: 30px mark, the date right-aligned, greeting, subline. */}
        <header className="flex w-full flex-col items-start gap-3.5">
          <Bar className="size-mark-lg rounded-8" />
          <Bar className="h-3.5 w-32 self-end" />
          <div className="flex w-full flex-col gap-3">
            <Bar className="h-5 w-48" />
            <Bar className="h-4 w-40" />
          </div>
          {/* The health card: p-2.5 around a 13px headline and a 12px sub-line. */}
          <Bar className="h-14 w-full rounded-18" />
        </header>
        <div className="flex flex-col gap-16">
          <DigestSkeleton />
          <WaitingSkeleton />
          <DueSkeleton />
        </div>
      </div>
    </div>
  );
}

/* --- The generic pair, still used by the routes without their own frame yet.
       Same shell and rhythm as the ones above, so they no longer look like a
       different application while they load. --------------------------------- */

/** A vertical list of rows inside a card — Clients, Library, Answer Desk. */
export function ListSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <SectionHeadingSkeleton />
      <CardWell>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between gap-4 px-2 pb-3 pt-1.5",
              i < rows - 1 && "divider-b border-border",
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Bar className="h-3.5 w-28" />
              <Bar className="h-3 w-full max-w-80" />
            </span>
            <Bar className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </CardWell>
    </div>
  );
}

/** The centered-column page frame used by most routes. */
export function ColumnSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <header className="mb-8 flex flex-col gap-2">
        <Bar className="h-3 w-44" />
        <Bar className="h-7 w-64 max-w-full" />
      </header>
      <ListSkeleton rows={rows} />
    </div>
  );
}

/* ============================================================================
   The admin pages: Overview, Team, Log grid, Weekly review.

   These four share one header shape — an uppercase eyebrow, a 28px title, an
   optional lede and a control on the right — so the header is one component and
   only the body differs. They are provisional in the same sense the pages are:
   no Figma frame exists for admin yet, so the measurements come from the pages
   themselves rather than from a drawing.

   Every one of them was a blank white screen for ~1s before this, because a
   route with no loading.tsx shows nothing at all while its data is in flight.
   ========================================================================== */

/** Eyebrow, 28px title, optional lede, optional right-hand control. */
function AdminHeaderSkeleton({
  lede = false,
  action = true,
}: {
  lede?: boolean;
  action?: boolean;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col">
        {/* 12px uppercase eyebrow, then the 28px heading. */}
        <Bar className="h-2.5 w-16" />
        <Bar className="mt-2 h-6 w-72 max-w-full" />
        {lede && <Bar className="mt-3 h-3 w-96 max-w-full" />}
      </div>
      {action && <Bar className="h-8 w-24 rounded-8" />}
    </header>
  );
}

/** A card shell at the admin CARD measurements: rounded-18, hairline, lift. */
function CardSkeleton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-18 border-fig border-border bg-surface-primary p-4 shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** /overview — the setup checklist and the coverage/delivery panels. */
export function OverviewSkeleton() {
  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <AdminHeaderSkeleton lede />
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <CardSkeleton key={i} className="flex flex-col gap-4">
            <Bar className="h-3.5 w-40" />
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center gap-3">
                <Bar className="size-avatar shrink-0 rounded-10" />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Bar className="h-3.5 w-32" />
                  <Bar className="h-3 w-full max-w-96" />
                </span>
                <Bar className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </CardSkeleton>
        ))}
      </div>
    </div>
  );
}

/** /admin — the invite card, then one card per colleague. */
export function TeamSkeleton() {
  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <AdminHeaderSkeleton />
      <div className="flex flex-col gap-6">
        <CardSkeleton className="flex flex-col gap-3">
          <Bar className="h-3.5 w-40" />
          <div className="flex items-end gap-2">
            <Bar className="h-9 flex-1 rounded-8" />
            <Bar className="h-8 w-24 shrink-0 rounded-8" />
          </div>
        </CardSkeleton>
        <div className="flex flex-col gap-2">
          <Bar className="h-3.5 w-24" />
          <Bar className="h-3 w-full max-w-96" />
          {[0, 1].map((i) => (
            <CardSkeleton key={i} className="flex flex-col gap-3">
              <Bar className="h-3.5 w-44" />
              <Bar className="h-3 w-56" />
              {/* The assignment chips: one pill per client. */}
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3].map((c) => (
                  <Bar key={c} className="h-5 w-20 rounded-full" />
                ))}
              </div>
            </CardSkeleton>
          ))}
        </div>
      </div>
    </div>
  );
}

/** /overview/logs — one row per client, one 10px cell per day. */
export function LogGridSkeleton({ days = 14 }: { days?: number }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <AdminHeaderSkeleton />
      <CardSkeleton className="flex flex-col gap-4">
        {[0, 1, 2].map((buyer) => (
          <div key={buyer} className="flex flex-col gap-2">
            <Bar className="h-3.5 w-36" />
            {[0, 1].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Bar className="h-3 w-28 shrink-0" />
                <span className="flex flex-1 flex-wrap gap-1">
                  {Array.from({ length: days }, (_, d) => (
                    <Bar key={d} className="size-2.5 rounded-4" />
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </CardSkeleton>
    </div>
  );
}

/** /overview/review — the week stepper, then one reconciliation row per client. */
export function WeeklyReviewSkeleton() {
  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <header className="mb-8 flex flex-col">
        <Bar className="h-2.5 w-16" />
        <Bar className="mt-2 h-6 w-72 max-w-full" />
        <Bar className="mt-3 h-3 w-96 max-w-full" />
        {/* Previous / week label / Next. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Bar className="h-8 w-24 rounded-8" />
          <Bar className="h-3.5 w-40" />
          <Bar className="h-8 w-16 rounded-8" />
        </div>
      </header>
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Bar className="size-avatar shrink-0 rounded-10" />
              <Bar className="h-3.5 w-32" />
            </div>
            {/* logged / actual / delta, three columns. */}
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((c) => (
                <span key={c} className="flex flex-col gap-1.5">
                  <Bar className="h-2.5 w-14" />
                  <Bar className="h-8 w-full rounded-8" />
                </span>
              ))}
            </div>
          </CardSkeleton>
        ))}
      </div>
    </div>
  );
}

/** /clients — the section header, then the list card at its real row pitch.
 *
 *  The rows are h-client-row like the real ones (55px, pinned on the element
 *  carrying the divider) rather than a guess, so the card is the same height
 *  before and after the data lands and nothing shifts under the reader.
 *
 *  Four rows because that is what the agency has. It is a placeholder, not a
 *  prediction: if the count is wrong the list simply grows or shrinks once,
 *  which is a smaller lie than a card of the wrong SHAPE. */
export function ClientsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col items-center px-6 pt-8">
      <div className="flex w-full max-w-sheet flex-col gap-16 pb-8 pt-16">
        <div className="flex w-full flex-col items-start gap-12">
          {/* 23px title, then its 13px line. */}
          <div className="flex w-full flex-col items-start gap-1">
            <Bar className="h-6 w-28" />
            <Bar className="mt-1 h-3 w-44" />
          </div>

          <div className="w-full rounded-18 border-fig border-border bg-surface-primary shadow-card">
            <div className="p-1">
              <div className="flex flex-col overflow-hidden rounded-14 border-fig border-border bg-surface-primary">
                {Array.from({ length: rows }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-client-row",
                      i > 0 && "divider-t border-border",
                    )}
                  >
                    <div className="flex h-full items-center justify-between gap-2 px-2.5">
                      <span className="flex min-w-0 max-w-client-text flex-1 flex-col gap-0.5">
                        {/* 13px name, then the 12px cadence line. */}
                        <Bar className="h-3.5 w-32" />
                        <Bar className="mt-1 h-3 w-full max-w-80" />
                      </span>
                      <Bar className="size-nav-icon shrink-0 rounded-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
