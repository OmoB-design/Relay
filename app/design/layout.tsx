import type { Metadata } from "next";
import Link from "next/link";

/* The design catalogue lives OUTSIDE the (app) route group on purpose — no app
   sidebar, no product chrome. What you see inside a specimen frame is the
   component, not the shell around it. */

export const metadata: Metadata = {
  title: "Relay design catalogue",
  // Internal tooling. Never indexed, never linked from product navigation.
  robots: { index: false, follow: false },
};

const SECTIONS: { href: string; label: string; hint: string }[] = [
  { href: "/design", label: "Index", hint: "Start here" },
  {
    href: "/design/tokens",
    label: "Tokens",
    hint: "Colour, type, radius, motion",
  },
  {
    href: "/design/components",
    label: "Components",
    hint: "Relay + shadcn primitives",
  },
  {
    href: "/design/states/today",
    label: "Today",
    hint: "28 frames, live specimens",
  },
  {
    href: "/design/states/client",
    label: "Client",
    hint: "Workspace — 4 tabs",
  },
  {
    href: "/design/states/narrative",
    label: "Narrative",
    hint: "The evidence stitch",
  },
  { href: "/design/states/loom", label: "Loom", hint: "Recording prep" },
  {
    href: "/design/states/answer-desk",
    label: "Answer Desk",
    hint: "Grounded vs honest miss",
  },
  {
    href: "/design/states/library",
    label: "Library",
    hint: "Everything produced",
  },
];

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <span className="font-display text-16 text-ink">Relay</span>
          <nav
            aria-label="Design catalogue"
            className="flex flex-wrap gap-x-4 gap-y-1"
          >
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                title={s.hint}
                className="font-ui text-13 text-ink-soft hover:text-verdigris"
              >
                {s.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/today"
            className="ml-auto font-ui text-12 text-ink-soft hover:text-verdigris"
          >
            ← Back to the app
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
        {children}
      </div>
    </div>
  );
}
