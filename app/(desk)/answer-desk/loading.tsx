/* The desk's own skeleton: the rail strip and the empty sheet — the same
   bones both desk states share — so the route never flashes a list-shaped
   page that neither state resembles. */
export default function Loading() {
  return (
    <div className="flex h-full w-full">
      <div className="hidden h-full w-nav shrink-0 bg-surface-foreground-01 md:block" />
      <main className="min-w-0 flex-1 bg-surface-primary md:rounded-l-24 md:border-fig md:border-border md:shadow-sheet" />
    </div>
  );
}
