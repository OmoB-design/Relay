"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlagCard } from "@/components/relay/FlagCard";
import { dismissFlagAction } from "@/app/(app)/today/actions";
import type { Flag } from "@/lib/types";

/* Client wrapper for Today's flags.

   `Edit & send` used to toast a placeholder — a dead end shipped as though it
   were a feature. It now does the real thing: a flag carrying a pre-drafted
   heads-up puts that note on the clipboard and opens the client, which is where
   the buyer would send it from. FlagCard only shows the button when a draft note
   exists, so it can never lead nowhere. */

export function TodayFlagList({
  items,
}: {
  items: { flag: Flag; clientName: string }[];
}) {
  const router = useRouter();

  async function editAndSend(flag: Flag, clientName: string) {
    if (!flag.draftNote) return;
    try {
      await navigator.clipboard.writeText(flag.draftNote);
      toast(`Heads-up note copied — opening ${clientName}`);
    } catch {
      // Clipboard access can be blocked. Navigating is still the useful half,
      // so say what happened rather than failing silently.
      toast(`Couldn't copy automatically — opening ${clientName}`);
    }
    router.push(`/clients/${flag.clientId}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map(({ flag, clientName }) => (
        <FlagCard
          key={flag.id}
          flag={flag}
          clientName={clientName}
          onDismiss={(reason) => dismissFlagAction(flag.id, reason)}
          onEditSend={() => editAndSend(flag, clientName)}
        />
      ))}
    </div>
  );
}
