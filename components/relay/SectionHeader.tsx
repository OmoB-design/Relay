import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* The masthead on a section page — Figma node 447:2580, "Page header".
 *
 *  NOT PageHeader. That one is Today's: a brand mark, the date right-aligned,
 *  and a greeting that addresses a person. This names a PLACE, so it drops the
 *  mark and the date and takes a bigger title — H5 at 23px against Today's H6
 *  at 19px. The two are different frames in Figma and different jobs on screen;
 *  collapsing them into one component with a variant flag would mean every
 *  future change to either had to reason about both.
 *
 *  Helvetica Neue, like the greeting, and for the same reason — see
 *  --font-greeting in globals.css for what that means off macOS.
 *
 *  4px between the title and its line, 48px to whatever follows. */
export function SectionHeader({
  title,
  subline,
  children,
  className,
}: {
  title: string;
  subline: string;
  /** The section's content. 48px below the title block, per the frame. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col items-start gap-12", className)}>
      <header className="flex w-full flex-col items-start gap-1">
        <h1 className="w-full font-greeting text-fig-h5 fig-medium text-heading-01">
          {title}
        </h1>
        <p className="w-full font-geist text-fig-body fig-w450 text-heading-06">
          {subline}
        </p>
      </header>
      {children}
    </div>
  );
}
