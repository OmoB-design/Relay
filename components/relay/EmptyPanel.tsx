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
        /* w-full is not decoration. Figma pins this at w-550 (447:2875) — the
           full column — and every parent here is a flex COLUMN with
           items-start, under which a child's width is shrink-to-fit, not the
           container. Figma's items-start does not mean that, because its
           children carry explicit widths.

           Without it the panel is as wide as its longest line and no wider, so
           it silently tracks the COPY: Today's first run happened to measure
           550 only because its sentence is long enough to clamp there, and the
           moment Clients got a shorter one it came out at 408. Two panels the
           frame draws identically, differing by a sentence. */
        "relative flex w-full min-h-due-empty flex-col rounded-18 bg-surface-primary p-1 shadow-card",
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
              /* text-balance, not a max-width. Both frames (357:1074 and
                 447:2573) draw this as two roughly equal centred lines, and
                 they get there by an explicit line break in Figma. Hard-coding
                 the pixel width that reproduces one of those breaks would be
                 fitting the container to today's sentence — it would be wrong
                 the moment the copy changed, and it is already two different
                 sentences on the two frames.

                 It replaces max-w-column, which is 720px and belongs to the
                 pre-redesign scale: wider than the well, so it constrained
                 nothing and the line ran the full width.

                 whitespace-pre-line lets a copy string carry the frame's OWN
                 break with a \n where the break point is part of the design.
                 Still soft: below the 550 column it re-wraps normally rather
                 than overflowing, which a hard <br> would not. */
              <p
                className={cn(
                  "whitespace-pre-line text-balance text-center font-geist text-fig-caption-1",
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
