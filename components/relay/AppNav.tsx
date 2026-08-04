"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Library,
  MessagesSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* App navigation. One source of nav items, rendered as a desktop sidebar list
   or a mobile bottom bar. Icon components can't live in the zod config, so the
   nav list lives here. */

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { label: "Today", href: "/today", icon: Home },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Answer Desk", href: "/answer-desk", icon: MessagesSquare },
  { label: "Library", href: "/library", icon: Library },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "bottom") {
    return (
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface-primary md:hidden"
      >
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 font-geist text-fig-caption-2",
                active ? "text-blue-500" : "text-heading-06",
              )}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-8 px-3 py-2 font-geist text-fig-body fig-w450",
              active
                ? "bg-blue-50 text-blue-500"
                : "text-heading-06 hover:bg-surface-foreground-01 hover:text-heading-01",
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
