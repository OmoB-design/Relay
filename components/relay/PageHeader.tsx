import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RelayMark } from "@/components/relay/NavIcons";

/* Today's masthead — Figma node 376:1678, the `page-header` and `first-run`
   variants.

   Brand mark, then the date right-aligned on its own line, then the greeting and
   a line of orientation under it. The date's alignment is the odd part and it is
   deliberate in the frame: `min-w-full` with `text-right` under a 30px mark, so
   the mark holds the left edge and the date holds the right without either being
   a row of its own. It reads as a masthead rather than a toolbar.

   THE GREETING IS THE ONE PLACE THE REDESIGN LEAVES GEIST — 19px Helvetica Neue
   Medium against Geist everywhere else. See --font-greeting in globals.css for
   what that means off macOS.

   `gap` is the only structural difference between the variants: 14px when the
   header is followed by the week's work, 24px when it is followed by an empty
   state, which needs more air under a greeting that has nothing to introduce. */

export function PageHeader({
  /** Pre-formatted, e.g. "Monday, July 13" — the caller owns the clock. */
  date,
  greeting,
  subline,
  /** A health card, or a first-run panel. Governs the gap above it. */
  children,
  variant = "week",
  notice,
  className,
}: {
  date: string;
  /** ReactNode, not string: Today wraps a visually-hidden "Today — " in front of
   *  it so the page's accessible name and its visible greeting agree. */
  greeting: ReactNode;
  subline: string;
  children?: ReactNode;
  variant?: "week" | "first-run";
  /** The pilot-clock warning, when it applies. */
  notice?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex w-full flex-col items-start",
        variant === "first-run" ? "gap-6" : "gap-3.5",
        className,
      )}
    >
      <div className="flex w-full flex-col items-start gap-3.5">
        <RelayMark size={30} className="size-mark-lg" />
        <p className="w-full text-right font-geist text-fig-body fig-w450 text-heading-05">
          {date}
        </p>
        {/* Both of these are "- MD" styles, so they take fig-medium (470) — the
            same reading as the nav label. Figma DECLARES 500 on them, which is
            the fig-sb step; see the note in globals.css about that ladder. */}
        <div className="flex w-full flex-col items-start gap-3">
          <h1 className="w-full font-greeting text-fig-h6 fig-medium text-heading-01">
            {greeting}
          </h1>
          <p className="w-full font-geist text-fig-body-lg fig-medium text-heading-06">
            {subline}
          </p>
        </div>
        {notice}
      </div>
      {children}
    </header>
  );
}
