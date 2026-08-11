"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";

/* Keeps a signed-in screen from going quietly stale.

   THE PROBLEM IT SOLVES. An admin assigns a client; the buyer's Today does not
   change, and — worse — nothing on screen suggests it should. The buyer has no
   way to know they are looking at an old answer, so they do not reload, so they
   keep working from it.

   TWO SIGNALS, deliberately, because they cover different halves:

     · FOCUS. The realistic case. The buyer is in Slack when the admin makes the
       change and comes back a minute later. Costs nothing, runs for everyone,
       and catches every kind of staleness rather than only assignments.

     · REALTIME. The case focus misses: the buyer is looking at the page the
       whole time. One channel, filtered to their own buyer_id, on a table that
       changes maybe monthly — so at rest this is an idle socket, not polling.

   IT NEVER READS THE PAYLOAD. The event is a doorbell, not a delivery:
   router.refresh() re-runs the server components, which re-read through RLS.
   That keeps the security model in exactly one place, and it means an event
   arriving for a row this user may not see leaks nothing — it just costs a
   render nobody notices. */
export function LiveRefresh({ buyerId }: { buyerId: string | null }) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    /* Alt-tabbing quickly fires focus repeatedly, and each refresh is a real
       round trip. Anything within two seconds of the last one is the same
       intent as that one. */
    const refresh = () => {
      const now = Date.now();
      if (now - lastRefresh.current < 2_000) return;
      lastRefresh.current = now;
      router.refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);

    /* Admins have no assignments of their own, and they are the ones making the
       change — so they get focus-refresh and no socket. */
    let closeChannel: (() => void) | undefined;
    if (buyerId) {
      const sb = browserClient();
      const channel = sb
        .channel(`assignments:${buyerId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "client_assignments",
            filter: `buyer_id=eq.${buyerId}`,
          },
          refresh,
        )
        .subscribe();
      closeChannel = () => void sb.removeChannel(channel);
    }

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      closeChannel?.();
    };
  }, [buyerId, router]);

  return null;
}
