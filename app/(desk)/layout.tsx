import { requireProfile } from "@/lib/auth";
import { LiveRefresh } from "@/components/relay/LiveRefresh";

/* The desk shell — the (app) frame WITHOUT the nav or the sheet. The Answer
   Desk owns both: its nav rail folds and its chat panel unfurls as part of
   the conversation choreography, and chrome the page cannot drive cannot move
   in sync with it. Auth and live refresh are the (app) shell verbatim. */
export default async function DeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-foreground-01">
      <LiveRefresh buyerId={isAdmin ? null : profile.id} />
      {children}
    </div>
  );
}
