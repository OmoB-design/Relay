import { ClientsSkeleton } from "@/components/relay/LoadingSkeletons";

/* Sized to the redesigned page (nodes 447:2573 / 417:3381), not to the list it
   replaced: same 550 column, same 55px rows, same card. A skeleton of the
   wrong shape moves the page at the exact moment the reader starts reading. */
export default function Loading() {
  return <ClientsSkeleton />;
}
