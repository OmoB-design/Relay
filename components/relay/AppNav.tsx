"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Gauge, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { Profile } from "@/lib/types";
import { signOutAction } from "@/app/(auth)/login/actions";
import {
  AnswerDeskGlyph,
  ClientsGlyph,
  LibraryGlyph,
  ExpandUpDownGlyph,
  PanelToggleGlyph,
  RelayMark,
  SettingsDialGlyph,
  SignOutDoorGlyph,
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
  /* Above Team, because it is the page an admin opens every morning — Team is
     something you visit when somebody joins or leaves. */
  {
    label: config.copy.overview.title,
    href: "/overview",
    Glyph: ({ className }) => (
      <Gauge aria-hidden="true" className={cn("size-nav-icon", className)} />
    ),
    adminOnly: true,
  },
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
  newTeamJoins = 0,
  defaultCollapsed = false,
  collapsed: collapsedProp,
  collapseMs,
}: {
  profile: Profile;
  isAdmin?: boolean;
  /** Colleagues who accepted an invite since Team was last opened. Marks the
   *  nav item, because an invite is accepted hours after it is sent and a
   *  message that only lands while someone is watching would mostly not. */
  newTeamJoins?: number;
  /** The narrative workspace opens with the rail collapsed (Figma 552:5160
   *  draws it at 55) — its own narratives panel takes the width the labels
   *  would. The stored preference is not read there; the toggle still works
   *  and still records the choice for the other screens. */
  defaultCollapsed?: boolean;
  /** CONTROLLED collapse, for the Answer Desk: the page folds the rail in
   *  sync with its chat panel's slide, so the choice is the page's, not the
   *  reader's — the toggle goes quiet and the stored preference is neither
   *  read nor written while this is set. */
  collapsed?: boolean;
  /** How long the width ride takes when the controller flips it. Unset, the
   *  toggle snaps like it always has. */
  collapseMs?: number;
}) {
  const pathname = usePathname();
  const controlled = collapsedProp !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = collapsedProp ?? internalCollapsed;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);

  // A navigation closes the drawer even when it lands on the same page the
  // item click didn't remount.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  /* Read the stored preference after mount, not during render: the server has
     no localStorage, and reading it in useState's initialiser would render one
     width on the server and another on the client. */
  useEffect(() => {
    if (defaultCollapsed || controlled) return;
    setInternalCollapsed(window.localStorage.getItem(STORE_KEY) === "1");
  }, [defaultCollapsed, controlled]);

  function toggle() {
    if (controlled) return;
    setInternalCollapsed((was) => {
      window.localStorage.setItem(STORE_KEY, was ? "0" : "1");
      return !was;
    });
  }

  return (
    <>
      <aside
        style={
          collapseMs !== undefined
            ? ({ "--nav-collapse-ms": `${collapseMs}ms` } as React.CSSProperties)
            : undefined
        }
        className={cn(
          /* h-full inside the shell's h-dvh, so the nav is exactly one viewport
             and never scrolls — the account tile stays on screen no matter how
             long the morning's list gets. No sticky needed: the sheet beside it
             is the scroll container, not the page. */
          "hidden h-full shrink-0 flex-col items-center justify-between overflow-hidden bg-surface-foreground-01 nav-width-ride md:flex",
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
            {!collapsed &&
              (controlled ? (
                /* The page owns the width here — the glyph stays (the frame
                   draws it) but it is furniture, not a control. */
                <span aria-hidden className="text-icon-explainer">
                  <PanelToggleGlyph direction="collapse" className="size-nav-icon" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Collapse sidebar"
                  className="text-icon-explainer"
                >
                  <PanelToggleGlyph direction="collapse" className="size-nav-icon" />
                </button>
              ))}
          </div>

          {collapsed && (
            <div className="flex w-full items-center justify-center pb-4 pt-2">
              {controlled ? (
                <span aria-hidden className="text-icon-explainer">
                  <PanelToggleGlyph direction="expand" className="size-nav-icon" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Expand sidebar"
                  className="text-icon-explainer"
                >
                  <PanelToggleGlyph direction="expand" className="size-nav-icon" />
                </button>
              )}
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
              const badge = href === "/admin" ? newTeamJoins : 0;
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
                      ? "bg-surface-primary shadow-nav-active"
                      : "hover:bg-surface-primary/60",
                  )}
                >
                  <span className="relative shrink-0">
                    <Glyph className={cn("size-nav-icon", glyphTone(active))} />
                    {/* Collapsed, the label is gone and the glyph is all there
                        is — so the dot rides the glyph rather than the row, and
                        survives the collapse. */}
                    {badge > 0 && collapsed && (
                      <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-blue-500" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap font-geist text-fig-caption-1-md fig-medium text-heading-01",
                      collapsed && "sr-only",
                    )}
                  >
                    {label}
                  </span>
                  {badge > 0 && !collapsed && (
                    <span
                      className="ml-auto shrink-0 rounded-full bg-blue-500 px-1.5 py-0.5 font-geist text-fig-caption-2 text-primary-foreground"
                      aria-label={`${badge} new ${badge === 1 ? "colleague" : "colleagues"}`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Account (670:5241): a true hairline seam over an 8px well. */}
        <div
          className={cn(
            "flex w-full flex-col items-center justify-center divider-t border-border px-2 py-2",
          )}
        >
          <AccountCard profile={profile} collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile ------------------------------------------------------------
          Not a bottom bar any more: a white top strip — the app's mark on the
          left, the panel toggle on the right — and the toggle slides the
          sidebar in as a drawer over a scrim, the way the desktop rail
          expands. Route changes and the scrim both close it. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-nav-header items-center justify-between divider-b border-border bg-surface-primary px-5 md:hidden">
        <Link href="/today" aria-label="Relay">
          <RelayMark className="size-nav-mark" />
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          className="text-icon-explainer"
        >
          <PanelToggleGlyph direction="expand" className="size-nav-icon" />
        </button>
      </header>

      {/* The scrim stays mounted so it can fade; closed it neither shows nor
          intercepts. */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-base-black transition-opacity duration-200 md:hidden",
          drawerOpen ? "opacity-30" : "pointer-events-none opacity-0",
        )}
      />
      {/* The reference's floating panel: it opens UNDER the top strip (the
          toggle stays visible above it), inset 4 from the left and 16 from the
          bottom, rounded 16 on all four corners, with the list a size up from
          the desktop rail — 15px labels on 20px glyphs, ~34px row pitch. */}
      <aside
        aria-label="Navigation drawer"
        className={cn(
          "fixed bottom-4 left-1 top-16 z-50 flex w-nav-drawer flex-col justify-between rounded-16 border-fig border-border bg-surface-primary shadow-popover transition-transform duration-200 ease-out md:hidden",
          drawerOpen ? "translate-x-0" : "drawer-hidden",
        )}
      >
        <nav aria-label="Primary" className="flex w-full flex-col gap-0.5 px-3 pt-4">
          {items.map(({ label, href, Glyph }) => {
            const active = isActive(pathname, href);
            const badge = href === "/admin" ? newTeamJoins : 0;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  "flex w-full items-center gap-3 overflow-hidden rounded-10 p-2",
                  active ? "bg-surface-foreground-01" : "hover:bg-surface-foreground-01/60",
                )}
              >
                <Glyph className={cn("size-5 shrink-0", glyphTone(active))} />
                <span className="whitespace-nowrap font-geist text-fig-body-lg fig-medium text-heading-01">
                  {label}
                </span>
                {badge > 0 && (
                  <span
                    className="ml-auto shrink-0 rounded-full bg-blue-500 px-1.5 py-0.5 font-geist text-fig-caption-2 text-primary-foreground"
                    aria-label={`${badge} new ${badge === 1 ? "colleague" : "colleagues"}`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex w-full flex-col px-3 pb-3">
          <AccountCard profile={profile} collapsed={false} />
        </div>
      </aside>
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
  const rootRef = useRef<HTMLDivElement>(null);

  /* Click-away and Escape both hand the keys back. */
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      <AnimatePresence>
        {open && (
          /* The account's own menu — the composer's @ popover language:
             same card, same pop, Settings first, Sign out underneath. */
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{
              type: "tween",
              duration: 0.14,
              ease: [0.22, 1, 0.36, 1],
            }}
            role="menu"
            aria-label="Account"
            className="absolute bottom-full left-0 z-10 mb-1.5 flex w-full min-w-nav-collapsed flex-col gap-0.5 rounded-10 border-fig border-border bg-surface-primary p-1 shadow-popover"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                toast("Settings is on its way — nothing to change here yet.");
              }}
              className="flex w-full items-center gap-2 rounded-8 px-2 py-1.5 text-left font-geist text-fig-caption-1-md fig-medium text-heading-03 transition-colors duration-100 ease-out hover:bg-surface-foreground-01"
            >
              <SettingsDialGlyph className="size-3.5 shrink-0" />
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => startTransition(() => signOutAction())}
              className="flex w-full items-center gap-2 rounded-8 px-2 py-1.5 text-left font-geist text-fig-caption-1-md fig-medium text-heading-03 transition-colors duration-100 ease-out hover:bg-surface-foreground-01"
            >
              <SignOutDoorGlyph className="size-3.5 shrink-0" />
              {pending ? config.copy.daily.working : "Sign out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
          <>
            {/* The tile's revision (357:2733): a 13px Medium name over a
                10px address, and the expand mark announcing the menu. */}
            <span className="flex min-w-0 flex-1 flex-col items-start justify-center gap-px">
              <span className="max-w-full truncate font-geist text-fig-body-sm fig-medium text-heading-01">
                {name}
              </span>
              <span className="max-w-full truncate font-geist text-fig-caption-2 text-heading-06">
                {profile.email}
              </span>
            </span>
            <ExpandUpDownGlyph className="size-2.75 shrink-0 text-icon-explainer" />
          </>
        )}
      </button>
    </div>
  );
}
