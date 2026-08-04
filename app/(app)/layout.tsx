import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { AppNav } from "@/components/relay/AppNav";
import { AccountMenu } from "@/components/relay/AccountMenu";

/* App shell: a persistent desktop sidebar and a mobile bottom nav bar.

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
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r border-border bg-surface-primary px-4 py-6 md:flex">
        <Link
          href="/today"
          className="px-3 font-geist text-22 fig-sb text-heading-01"
        >
          Relay
        </Link>
        <AppNav variant="sidebar" isAdmin={profile.role === "admin"} />
        <div className="mt-auto">
          <AccountMenu profile={profile} />
        </div>
      </aside>

      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      <AppNav variant="bottom" isAdmin={profile.role === "admin"} />
    </div>
  );
}
