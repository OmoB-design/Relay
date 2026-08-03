import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* EmptyState (design.md §3): dashed 1.5px line border, radius 10, centered.
   Empty states are invitations to act, never blank panels (CLAUDE.md UI rules). */

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: ReactNode; // one-line explanation
  action?: ReactNode; // the single CTA
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-hair border-dashed border-line px-6 py-12 text-center",
        className,
      )}
    >
      <p className="font-ui text-16 text-ink">{title}</p>
      {children && (
        <p className="max-w-md font-ui text-14 text-ink-soft">{children}</p>
      )}
      {action}
    </div>
  );
}
