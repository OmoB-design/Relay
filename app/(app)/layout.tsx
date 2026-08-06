import { requireProfile } from "@/lib/auth";
import { AppNav } from "@/components/relay/AppNav";

/* App shell. AppNav owns the whole sidebar now — logo strip, items and account
   card are a single Figma frame (357:2590), and splitting them between the
   layout and a child meant the collapse state would have to live in two places
   to change one width. On mobile the same component renders the bottom bar.

   Every app route requires an active account. requireProfile() redirects to
   /login, and a revoked account is signed out rather than shown a shell full of
   empty sections — that would read as a bug rather than as a withdrawal. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen bg-surface-foreground-01 md:flex">
      <AppNav profile={profile} isAdmin={profile.role === "admin"} />
      {/* THE CONTENT SHEET (node 357:1074). The page is a white surface that
          sits BESIDE the nav rather than under it: rounded on its left corners
          only, so it reads as sliding out from behind the sidebar and running
          off the right edge of the window.

          Desktop only. Below md the nav is a bottom bar, there is nothing to
          slide out from behind, and 24px corners on a full-bleed page would
          just be two odd notches at the top. */}
      <main className="flex-1 pb-24 md:min-w-0 md:rounded-l-24 md:border-fig md:border-border md:bg-surface-primary md:pb-0 md:shadow-sheet">
        {children}
      </main>
    </div>
  );
}
