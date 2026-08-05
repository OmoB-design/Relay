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

/** Yesterday's numbers. Rows carry the 34px client mark. */
export function DigestSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeadingSkeleton />
      <CardWell fill="bg-panel">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 px-2 pb-3 pt-1.5",
              i < rows - 1 && "divider-b border-border",
            )}
          >
            <Bar className="size-avatar shrink-0 rounded-10" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Bar className="h-3.5 w-28" />
              <Bar className="h-3 w-full max-w-80" />
            </span>
          </div>
        ))}
      </CardWell>
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

/** Due this week — the row ends in a button, so the block on the right is
 *  taller than an age stamp and has the button's radius. */
export function DueSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeadingSkeleton />
      <CardWell>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between gap-3 px-2 pb-3 pt-1.5",
              i < rows - 1 && "divider-b border-border",
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Bar className="h-3.5 w-28" />
              <Bar className="h-3 w-full max-w-72" />
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <Bar className="h-3 w-16" />
              <Bar className="h-7 w-20 rounded-8" />
            </span>
          </div>
        ))}
      </CardWell>
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

/** The whole Today page, header included. */
export function TodaySkeleton() {
  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <header className="mb-8 flex flex-col gap-2">
        <Bar className="h-3 w-44" />
        <Bar className="h-7 w-72 max-w-full" />
        <Bar className="h-3.5 w-96 max-w-full" />
      </header>
      <div className="flex flex-col gap-10">
        <DigestSkeleton />
        <WaitingSkeleton />
        <DueSkeleton />
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
