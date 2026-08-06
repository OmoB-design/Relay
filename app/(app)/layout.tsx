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

  /* THE SHELL IS EXACTLY ONE VIEWPORT TALL and never scrolls itself; the content
     sheet is the only scroll container. That is what keeps the sidebar and the
     account tile pinned while the morning's work moves under them.

     h-dvh, not h-screen: on mobile Safari and Chrome 100vh is the height with
     the URL bar HIDDEN, so a 100vh shell is taller than what you can actually
     see and the bottom nav sits below the fold until you scroll. dvh tracks the
     visible viewport as the bar comes and goes. */
  return (
    <div className="flex h-dvh overflow-hidden bg-surface-foreground-01">
      <AppNav profile={profile} isAdmin={profile.role === "admin"} />
      {/* THE CONTENT SHEET (node 357:1074). A white surface that sits BESIDE the
          nav rather than under it: rounded on its left corners only, so it reads
          as sliding out from behind the sidebar and running off the right edge.

          Rounding is desktop-only — below md the nav is a bottom bar, there is
          nothing to slide out from behind, and two 24px notches at the top of a
          full-bleed page is just odd. The scrolling is not: the sheet is the
          scroll container at every width.

          overscroll-contain stops a flick at the end of the list from chaining
          out to the document and rubber-banding the whole shell. */}
      <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain pb-24 md:rounded-l-24 md:border-fig md:border-border md:bg-surface-primary md:pb-0 md:shadow-sheet">
        {children}
      </main>
    </div>
  );
}
