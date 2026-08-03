import Link from "next/link";
import { AppNav } from "@/components/relay/AppNav";

/* App shell: a persistent desktop sidebar and a mobile bottom nav bar. The
   product screens render inside <main>. */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-6 md:flex">
        <Link href="/today" className="px-3 font-display text-22 text-ink">
          Relay
        </Link>
        <AppNav variant="sidebar" />
      </aside>

      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      <AppNav variant="bottom" />
    </div>
  );
}
