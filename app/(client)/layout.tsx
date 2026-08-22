import { requireProfile } from "@/lib/auth";
import { countNewTeamJoins } from "@/lib/team";
import { AppNav } from "@/components/relay/AppNav";
import { LiveRefresh } from "@/components/relay/LiveRefresh";
import { WorkspaceDials } from "@/components/relay/WorkspaceDials";

/* The client workspace shell — the (app) shell verbatim EXCEPT the sheet.
   Node 683:8146 redraws the client page's surface: an 8px corner instead of
   24, the stroke in ink at 7% instead of the #eaeaea hairline, and the halo
   a step quieter. The page is deliberately the only one that looks like
   this — its own route group scopes the chrome, and if the treatment is
   promoted app-wide later, these classes move to (app)/layout.tsx and this
   group folds back in. Everything else — auth, live refresh, the expanded
   nav, the scroll discipline — must stay identical to (app), or the client
   page would feel like a different app rather than a different page. */
export default async function ClientWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const newTeamJoins = isAdmin ? await countNewTeamJoins(profile.id) : 0;

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-foreground-01">
      <LiveRefresh buyerId={isAdmin ? null : profile.id} />
      <AppNav
        profile={profile}
        isAdmin={isAdmin}
        newTeamJoins={newTeamJoins}
      />
      <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain scrollbar-stable bg-surface-primary pt-15 md:rounded-l-8 md:border-fig md:border-border-sheet md:pt-0 md:shadow-sheet-quiet">
        {children}
      </main>
      {/* Dev-only dial panel — the timeline's rail pour registers here. */}
      <WorkspaceDials />
    </div>
  );
}
