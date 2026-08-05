import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClientAvatar } from "@/components/relay/ClientAvatar";

/* The card-shaped empty state — Figma node 365:3311, the due row's "All caught
   up" frame, generalised.

   It is a separate component from the legacy EmptyState rather than a rewrite of
   it. EmptyState still serves Clients, Library and Answer Desk, none of which
   have been redesigned; changing it would restyle three screens nobody has
   looked at yet. This one is used only where a Figma frame exists.

   The shape it inherits from the frame: a dashed hairline at radius 18 wrapping
   an inset well at radius 14, the client mark's own 34px tile with a glyph in it
   rather than a logo, a 13px title and a centred 12px line under it.

   HAIRLINES. The frame stacks four shells at the same 18px radius — dashed 1px,
   dashed 0.7px, 0.4px, and a 0.5px divider. Concentric hairlines at one radius
   band visibly, so they resolve to one dashed 0.7px outer and one solid inner
   well, per the single-weight rule in globals.css. */

export function EmptyPanel({
  title,
  glyph,
  children,
  action,
  className,
}: {
  title: string;
  /** 14px, rendered inside the client mark's tile. */
  glyph: ReactNode;
  /** One line. Empty states are invitations, not documentation. */
  children?: ReactNode;
  /** At most one CTA, and only when the reader can actually act. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-due-empty flex-col rounded-18 border-fig border-dashed border-border bg-surface-primary p-1 shadow-card",
        className,
      )}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-14 border-fig border-border bg-surface-dashboard px-2 pb-3 pt-1">
        <div className="flex flex-col items-center justify-center gap-2">
          <ClientAvatar name="" glyph={glyph} />
          <div className="flex flex-col items-center justify-center gap-3">
            <p className="font-geist text-fig-body fig-w450 text-heading-01">
              {title}
            </p>
            {children && (
              <p className="max-w-column text-center font-geist text-fig-caption-1 text-heading-06">
                {children}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}
