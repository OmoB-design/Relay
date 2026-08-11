import { OverviewSkeleton } from "@/components/relay/LoadingSkeletons";

/* Without this the route showed nothing at all for ~1s — a route with no
   loading.tsx holds the previous page, then swaps. Streaming the shell first
   is the whole of the perceived improvement; the data still takes what it
   takes. */
export default function Loading() {
  return <OverviewSkeleton />;
}
