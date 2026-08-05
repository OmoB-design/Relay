import { cn } from "@/lib/utils";

/* A Today section heading: glyph, label, then a hairline running to the edge.

   Taken from Figma node 357:2336, the header of the "Waiting on you" frame. It
   is shared rather than living inside WaitingList because a page whose three
   sections announce themselves three different ways reads as three pages. The
   glyph is optional — Waiting is the only section with a frame so far, so the
   others get the same rule and type with nothing in front of it, and pick up
   their own glyph when their frame lands. */

export function SectionHeading({
  title,
  glyph,
  className,
}: {
  title: string;
  /** 14px, tinted by the parent. */
  glyph?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center gap-4", className)}>
      <span className="flex shrink-0 items-center gap-1.5 text-icon-nav-active">
        {glyph}
        <span className="whitespace-nowrap font-geist text-fig-body fig-medium text-heading-06">
          {title}
        </span>
      </span>
      {/* A rule, not a border on the row: it has to start after the label and
          run to the far edge, which a border on the container cannot do. */}
      <span aria-hidden="true" className="h-0 min-w-px flex-1 divider-b border-border" />
    </div>
  );
}
