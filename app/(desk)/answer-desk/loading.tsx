/* The desk's own skeleton, in the desk's real anatomy: the folded 55 rail,
   the 300 chat panel with control bones, and the empty sheet — so the route
   paints its shape the instant the layout resolves instead of holding a
   blank frame while the data wave lands. First-run users (no chats) see the
   panel bone resolve away; returning users see the truth immediately. */
export default function Loading() {
  return (
    <div className="flex h-full w-full">
      <div className="hidden h-full w-nav-collapsed shrink-0 bg-surface-foreground-01 md:block" />
      <div className="hidden h-full w-desk-panel shrink-0 flex-col gap-2 bg-surface-dashboard px-2 pb-2.5 pt-5 md:flex">
        <div className="h-8.5 w-full animate-pulse rounded-10 bg-surface-foreground-02" />
        <div className="h-desk-pill w-full animate-pulse rounded-10 bg-surface-foreground-02" />
        <div className="mt-4 flex flex-col gap-2">
          <div className="h-8.5 w-full animate-pulse rounded-10 bg-surface-foreground-01" />
          <div className="h-8.5 w-4/5 animate-pulse rounded-10 bg-surface-foreground-01" />
          <div className="h-8.5 w-full animate-pulse rounded-10 bg-surface-foreground-01" />
        </div>
      </div>
      <main className="min-w-0 flex-1 bg-surface-primary md:rounded-l-24 md:border-fig md:border-border md:shadow-sheet" />
    </div>
  );
}
