import { Skeleton } from "@/components/ui/skeleton";

/* Shared loading skeletons for route-level Suspense (loading.tsx). Calm,
   token-driven placeholders that echo each surface's real layout. */

/** A vertical list of rows inside a bordered card — Today, Clients, Library. */
export function ListSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 last:border-b-0"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The centered-column page frame used by most routes. */
export function ColumnSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <ListSkeleton rows={rows} />
    </div>
  );
}
