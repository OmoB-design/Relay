import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClientAvatar } from "@/components/relay/ClientAvatar";
import { DashedOutline } from "@/components/relay/DashedOutline";

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
  bodyTone = "text-caption-1",
  wellTone = "bg-surface-foreground-01",
  className,
}: {
  title: string;
  /** 14px, rendered inside the client mark's tile. */
  glyph: ReactNode;
  /** One line. Empty states are invitations, not documentation. */
  children?: ReactNode;
  /** At most one CTA, and only when the reader can actually act. */
  action?: ReactNode;
  /** The two frames disagree: the first-run panels (376:1678) put the body in
   *  Caption 1 #959595, the due-row panel (365:3311) in Heading-06 #5a5a5a.
   *  Caption 1 is the default because it is the newer frame. */
  bodyTone?: string;
  /** And they disagree on the well too. First-run and the digest's empty state
   *  are Surface/Foreground-01 (357:1074); the due row's "All caught up" is
   *  Surface/Dashboard, which node 365:3662 confirms it kept. */
  wellTone?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-due-empty flex-col rounded-18 bg-surface-primary p-1 shadow-card",
        className,
      )}
    >
      <DashedOutline />
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-4 rounded-14 border-fig border-border px-2 pb-3 pt-1",
          wellTone,
        )}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <ClientAvatar name="" glyph={glyph} />
          <div className="flex flex-col items-center justify-center gap-3">
            <p className="font-geist text-fig-body fig-w450 text-heading-01">
              {title}
            </p>
            {children && (
              <p
                className={cn(
                  "max-w-column text-center font-geist text-fig-caption-1",
                  bodyTone,
                )}
              >
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
