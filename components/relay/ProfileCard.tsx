import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { PencilGlyph } from "@/components/relay/NavIcons";

/* The profile page's card family — every card on node 417:3401 is one shape:
   a rounded-18 card filled Surface/DASHBOARD, a 12px label sitting on the
   wash, the content, and often a footer row back on the wash.

   It INVERTS the digest card (white card, #fcfcfc well): here the wash is the
   card and the white is the well, which is what makes the label read as
   written ON the card rather than boxed inside it. The frame's stacked shells
   (two #fcfcfc layers, 0.5px + 0.4px hairlines, two shadows) resolve to one
   hairline and one shadow per the single-weight rule in globals.css.

   TWO INTERIORS, from the frame:
     · the left column's cards inset a single white rounded-14 well by 4px —
       that is ProfileWell;
     · the KPI and Stakeholder cards run their white rows edge-to-edge, the
       rows' 16px corners clipped by the card — that is ProfileRows.
   Both keep the label 14px from the card edge, which is why the label row
   carries px-3.5 rather than the interiors carrying a shared inset. */

export function ProfileCard({
  label,
  children,
  footer,
  className,
}: {
  /** The 12px line on the wash. A string is wrapped; a node is trusted. */
  label: ReactNode;
  children: ReactNode;
  /** Rendered on the wash below the content — the frame's Add/Save rows. */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        /* NO overflow-hidden, deliberately: the cadence card's dropdowns open
           4px below their fields and must float over whatever is beneath the
           card. Corner clipping is owned by the children that need it —
           ProfileRows and ProfileWell round and clip themselves. */
        "w-full rounded-18 border-fig border-border bg-surface-dashboard shadow-card",
        className,
      )}
    >
      <div className="flex w-full flex-col pt-1">
        <div className="flex items-center px-3.5 py-1.5">
          {typeof label === "string" ? (
            <h3 className="font-geist text-fig-caption-1 text-heading-06">
              {label}
            </h3>
          ) : (
            label
          )}
        </div>
        {children}
        {footer}
      </div>
    </section>
  );
}

/** The left column's single white well, inset 4px on the wash. `last` adds the
 *  4px below that the frame gives a well with nothing under it. */
export function ProfileWell({
  children,
  last = false,
  className,
}: {
  children: ReactNode;
  last?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Same reason as the card: a dropdown inside must be free to overhang.
        "mx-1 rounded-14 border-fig border-border bg-surface-primary",
        last && "mb-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The KPI/Stakeholder row group: edge-to-edge white, 16px end corners, one
 *  hairline around and one between rows — the resolved form of the frame's
 *  per-row 0.4px borders, whose seams are stacked pairs. */
export function ProfileRows({ children }: { children: ReactNode }) {
  return (
    <ul className="flex w-full flex-col overflow-hidden rounded-16 border-fig border-border bg-surface-primary">
      {children}
    </ul>
  );
}

/** One 59px row: a two-line stack on the left, Edit on the right. When
 *  `editing`, the row unpins its height and renders the form instead — the
 *  frame does not draw the edit state, so the form keeps the field layer's
 *  own styling and the row simply grows. */
export function ProfileRow({
  first = false,
  editing = false,
  children,
}: {
  first?: boolean;
  editing?: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        !first && "divider-t border-border",
        editing ? "px-2 py-3" : "h-profile-row",
      )}
    >
      {children}
    </li>
  );
}

/** The row's left stack: 13px title over a 12px meta line with 3px dots. */
export function ProfileRowBody({
  title,
  meta,
}: {
  title: string;
  /** Rendered in order with a dot between each pair. */
  meta: ReactNode[];
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
      <span className="truncate font-geist text-fig-body fig-w450 text-heading-01">
        {title}
      </span>
      {/* ONE line, always. The row is pinned at 59px, so a meta line that
          wraps does not grow the row — it overflows it and lands on the next
          one (Northbrook's "spend pace" did exactly this). Longer metrics
          truncate instead; each segment carries its own ellipsis. */}
      <span className="flex min-w-0 items-center gap-1.5 overflow-hidden font-geist text-fig-caption-1 text-heading-06">
        {/* Earlier facts hold their width; only the LAST segment gives way.
            Ellipsis spread across every segment reads like damage — one
            ellipsis at the tail reads like a longer line. */}
        {meta.map((part, i) => (
          <span
            key={i}
            className={cn(
              "flex items-center gap-1.5",
              i === meta.length - 1 ? "min-w-0" : "shrink-0",
            )}
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className="size-dot-sm shrink-0 rounded-full bg-grey-200"
              />
            )}
            <span className="truncate">{part}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

/** The 14px pencil + "Edit", Heading-03 (node 422:6600). */
export function ProfileRowEdit({
  onClick,
  label,
}: {
  onClick: () => void;
  /** Accessible name — "Edit blended ROAS", not just "Edit". */
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex shrink-0 items-center gap-1.5 font-geist text-fig-body fig-w450 text-heading-03 hover:text-heading-01"
    >
      <PencilGlyph className="size-nav-icon text-icon-explainer" />
      {config.copy.actions.edit}
    </button>
  );
}

/** The footer on the wash: 14px sides, 16px vertical (node 422:6643). */
export function ProfileFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center gap-1.5 px-3.5 py-4", className)}>
      {children}
    </div>
  );
}
