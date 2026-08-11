"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markTeamSeenAction } from "@/app/(app)/admin/actions";

/* Renders nothing; clears the nav's "new colleague" marker once the admin has
   the team list in front of them.

   It runs on mount rather than on click because arriving at the page IS the
   acknowledgement — there is nothing further to do about a colleague having
   joined, so making them dismiss it would be a chore with no purpose.

   `done` guards against React's development double-effect and against a
   re-render firing a second write for the same visit. */
export function MarkTeamSeen({ pending }: { pending: boolean }) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (!pending || done.current) return;
    done.current = true;
    void markTeamSeenAction().then(() => {
      // Re-render the layout so the marker disappears now, not on next nav.
      router.refresh();
    });
  }, [pending, router]);

  return null;
}
