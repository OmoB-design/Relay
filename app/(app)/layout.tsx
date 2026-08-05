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
    <div className="min-h-screen md:flex">
      <AppNav profile={profile} isAdmin={profile.role === "admin"} />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
    </div>
  );
}
