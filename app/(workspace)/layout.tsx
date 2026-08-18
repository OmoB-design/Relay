import { requireProfile } from "@/lib/auth";
import { countNewTeamJoins } from "@/lib/team";
import { AppNav } from "@/components/relay/AppNav";
import { LiveRefresh } from "@/components/relay/LiveRefresh";
import { WorkspaceDials } from "@/components/relay/WorkspaceDials";

/* The workspace shell — the same one-viewport frame as (app), WITHOUT the
   white content sheet. The narrative workspace (Figma 506:5375) slides its
   narratives panel in between the nav and the sheet, both on the wash, so the
   sheet has to belong to the page here rather than to the layout. Everything
   else — auth, live refresh, the nav itself — is the (app) shell verbatim. */
export default async function WorkspaceLayout({
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
        defaultCollapsed
      />
      <main className="flex min-w-0 flex-1 overflow-hidden pt-15 md:pt-0">
        {children}
      </main>
      <WorkspaceDials />
    </div>
  );
}
