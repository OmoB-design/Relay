"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { Profile } from "@/lib/types";
import { signOutAction } from "@/app/(auth)/login/actions";
import {
  AnswerDeskGlyph,
  ClientsGlyph,
  LibraryGlyph,
  PanelToggleGlyph,
  RelayMark,
  TodayGlyph,
} from "@/components/relay/NavIcons";

/* ============================================================================
   The sidebar — Figma node 357:2590, both variants (Expanded 230 / collapsed 55).

   FOUR DEPARTURES FROM THE FRAME, all deliberate:

   1. TEAM. The frame draws four items; the app has a fifth, admin-only. Figma
      has no glyph for it, so it borrows lucide's shield at the same 14px rather
      than inventing one in the Figma style and pretending it came from there.

   2. SIGN OUT. The frame's account card is a resting state with no way out of
      the app. Rather than bolt a control onto it, clicking the card discloses
      one above it — the card at rest still looks exactly like the frame.

   3. THE AVATAR. The frame shows a photograph. Relay has no avatar source for a
      buyer yet (the domain-based client mark is a different feature), so this
      falls back to an initial on the same 21px circle.

   4. HAIRLINES. The frame carries 0.565px on the account card and 0.5px under
      it; both resolve to the single 0.7px border-fig, per the one-weight rule
      in globals.css. The bottom 0.5px is dropped outright — it sits on the last
      element in the column, against the window edge, drawing a line under
      nothing.

   Two near-invisible drop shadows on the resting Answer Desk and Library items
   (0.75px blur at 25% of #d6d6d6 / #ebeaea) are also dropped. They are not on
   Clients, which makes them leftovers rather than a pattern.
   ========================================================================== */

type NavItem = {
  label: string;
  href: string;
  Glyph: (props: { className?: string }) => React.ReactNode;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { label: "Today", href: "/today", Glyph: TodayGlyph },
  { label: "Clients", href: "/clients", Glyph: ClientsGlyph },
  { label: "Answer Desk", href: "/answer-desk", Glyph: AnswerDeskGlyph },
  { label: "Library", href: "/library", Glyph: LibraryGlyph },
  {
    label: config.copy.admin.title,
    href: "/admin",
    Glyph: ({ className }) => (
      <ShieldCheck aria-hidden="true" className={cn("size-nav-icon", className)} />
    ),
    adminOnly: true,
  },
];

const STORE_KEY = "relay:nav-collapsed";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The glyph colours are the whole active state besides the white pill: Figma
 *  darkens the selected icon to #212121 and leaves the rest at #424242. */
const glyphTone = (active: boolean) =>
  active ? "text-icon-system" : "text-icon-nav-active";

function displayName(profile: Profile): string {
  return profile.name.trim() || profile.email.split("@")[0]!;
}

export function AppNav({
  profile,
  isAdmin = false,
}: {
  profile: Profile;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);

  /* Read the stored preference after mount, not during render: the server has
     no localStorage, and reading it in useState's initialiser would render one
     width on the server and another on the client. */
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((was) => {
      window.localStorage.setItem(STORE_KEY, was ? "0" : "1");
      return !was;
    });
  }

  return (
    <>
      <aside
        className={cn(
          /* h-full inside the shell's h-dvh, so the nav is exactly one viewport
             and never scrolls — the account tile stays on screen no matter how
             long the morning's list gets. No sticky needed: the sheet beside it
             is the scroll container, not the page. */
          "hidden h-full shrink-0 flex-col items-center justify-between overflow-hidden bg-surface-foreground-01 md:flex",
          collapsed ? "w-nav-collapsed" : "w-nav",
        )}
      >
        <div className="flex w-full flex-col items-center justify-center">
          {/* Logo strip ------------------------------------------------- */}
          <div
            className={cn(
              "flex h-nav-header w-full items-center px-2 pb-2 pt-2.5",
              collapsed ? "flex-col justify-center" : "justify-between",
            )}
          >
            <Link href="/today" aria-label="Relay">
              <RelayMark className="size-nav-mark" />
            </Link>
            {!collapsed && (
              <button
                type="button"
                onClick={toggle}
                aria-label="Collapse sidebar"
                className="text-icon-explainer"
              >
                <PanelToggleGlyph direction="collapse" className="size-nav-icon" />
              </button>
            )}
          </div>

          {collapsed && (
            <div className="flex w-full items-center justify-center pb-4 pt-2">
              <button
                type="button"
                onClick={toggle}
                aria-label="Expand sidebar"
                className="text-icon-explainer"
              >
                <PanelToggleGlyph direction="expand" className="size-nav-icon" />
              </button>
            </div>
          )}

          {/* Items ------------------------------------------------------ */}
          <nav
            aria-label="Primary"
            className={cn(
              "flex w-full flex-col gap-0.5 px-2",
              collapsed && "items-center",
            )}
          >
            {items.map(({ label, href, Glyph }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex items-center gap-1.5 overflow-hidden rounded-10 p-2",
                    collapsed ? "shrink-0" : "w-full",
                    active
                      ? "bg-surface-primary"
                      : "hover:bg-surface-primary/60",
                  )}
                >
                  <Glyph className={cn("size-nav-icon", glyphTone(active))} />
                  <span
                    className={cn(
                      "whitespace-nowrap font-geist text-fig-caption-1-md fig-medium text-heading-01",
                      collapsed && "sr-only",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Account ------------------------------------------------------ */}
        <div
          className={cn(
            "flex w-full flex-col items-center justify-center px-2 pb-1",
            collapsed ? "pt-2" : "h-nav-profile pt-0.5",
          )}
        >
          <AccountCard profile={profile} collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile ---------------------------------------------------------- */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-10 flex divider-t border-border bg-surface-primary md:hidden"
      >
        {items.map(({ label, href, Glyph }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2 font-geist text-fig-caption-2 text-heading-01"
            >
              <Glyph className={cn("size-nav-icon", glyphTone(active))} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** The account tile, plus the sign-out the frame has nowhere to put. */
function AccountCard({
  profile,
  collapsed,
}: {
  profile: Profile;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const name = displayName(profile);

  return (
    <div className="relative w-full">
      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-full min-w-nav-collapsed overflow-hidden rounded-10 border-fig border-border bg-surface-primary shadow-nav-profile">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => signOutAction())}
            className="flex w-full items-center gap-1.5 p-2 font-geist text-fig-caption-2 text-heading-01 hover:bg-surface-foreground-01"
          >
            <LogOut aria-hidden="true" className="size-nav-icon" />
            {pending ? config.copy.daily.working : "Sign out"}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${name} — account`}
        className={cn(
          "flex items-center gap-1.5 overflow-hidden rounded-10 border-fig border-border bg-surface-primary shadow-nav-profile",
          /* Node 357:1074 revised this tile: 42px tall with a 25px avatar,
             where the standalone nav frame drew it shorter and tighter. */
          collapsed
            ? "size-8 shrink-0 justify-center p-1.5"
            : "h-nav-card w-full px-1.5 py-2.5",
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-nav-avatar shrink-0 items-center justify-center rounded-full bg-surface-foreground-01 font-geist text-fig-caption-2 fig-medium uppercase text-heading-06"
        >
          {name.slice(0, 1)}
        </span>
        {!collapsed && (
          <span className="flex min-w-0 flex-col items-start justify-center">
            <span className="max-w-full truncate font-geist text-fig-caption-2 fig-medium text-heading-01">
              {name}
            </span>
            <span className="max-w-full truncate font-geist text-fig-caption-2 text-heading-06">
              {profile.email}
            </span>
          </span>
        )}
      </button>
    </div>
  );
}
