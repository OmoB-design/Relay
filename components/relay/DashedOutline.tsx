import { cn } from "@/lib/utils";

/* A 0.7px dashed edge that you can actually see.
 *
 *  WHY THIS IS NOT `border: 0.7px dashed`. CSS derives dash length from border
 *  width — roughly 3× — so a 0.7px dashed border draws ~2px dashes with ~2px
 *  gaps. That halves the ink of the solid hairline sitting next to it, and at
 *  Surface/Stroke #eaeaea on white it drops under the threshold where the eye
 *  registers an edge at all. The dashes are drawn correctly and are invisible.
 *
 *  Raising the width to 1px fixes the visibility and breaks the one-weight rule.
 *  An SVG stroke is the only way to hold both: `stroke-width` stays 0.7 while
 *  `stroke-dasharray` is set independently, so the dashes get their ink from
 *  LENGTH rather than from thickness.
 *
 *  GEOMETRY. The stroke straddles the rect's edge — half in, half out — so the
 *  svg is inset by half the stroke and the rect's radius drops by the same
 *  amount. The painted outer edge then lands exactly where a border would have.
 *
 *  That inset comes from `hairline-outline`, which sets the svg's width and
 *  height outright. It cannot be `absolute inset-hair-half`: an svg is a
 *  replaced element, so four offsets with no explicit size get it the default
 *  300x150 box, not the parent's. See the utility in globals.css.
 *
 *  The parent must be `relative`, and must NOT also carry a border. */
export function DashedOutline({
  /** The parent's border-radius. The rect's own is this minus half the stroke. */
  radius = 18,
  className,
}: {
  radius?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("hairline-outline pointer-events-none text-border", className)}
    >
      <rect
        width="100%"
        height="100%"
        rx={radius - 0.35}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.7}
        /* Figma's codegen does not expose the dash length, only that the stroke
           is dashed, so this pattern is a judgement call: long enough to read at
           0.7px, short enough to still look dashed on a 550px edge. */
        strokeDasharray="4 3"
      />
    </svg>
  );
}
