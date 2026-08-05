import { TodaySkeleton } from "@/components/relay/LoadingSkeletons";

/* Today has real frames now, so it gets a skeleton shaped like them rather than
   the generic column — same shells, same row rhythm, so nothing jumps when the
   content lands. */
export default function Loading() {
  return <TodaySkeleton />;
}
