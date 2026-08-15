import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { Input } from "@/components/ui/input";
import { PencilGlyph, TrashGlyph } from "@/components/relay/NavIcons";

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

/* The row-in-a-shared-well family (ProfileRows/ProfileRow) retired here: the
   metric component sets 499:3562 and 499:3921 draw each item as its OWN card,
   with the edit state expanding in place — see ItemCard and ItemEditShell. */

/** One metric or stakeholder at rest — its own white card (sets 499:3562 /
 *  499:3921): rounded 16, one hairline, 10px vertical, the row inset 8px. */
export function ItemCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full rounded-16 border-fig border-border bg-surface-primary py-2.5">
      <div className="flex items-center justify-between gap-2 px-2">
        {children}
      </div>
    </div>
  );
}

/** The same item, editing — the card swaps to a wash container holding a
 *  white field card and a Remove | Cancel · Save footer. The KPI variant
 *  writes the metric's name on the wash first; the stakeholder variant goes
 *  straight to the fields, so `label` is optional and the 4px headroom
 *  belongs to it. */
export function ItemEditShell({
  label,
  footer,
  children,
}: {
  label?: string;
  /** Remove on the left, Cancel · Save on the right. */
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-18 border-fig border-border bg-surface-foreground-01 shadow-card",
        label && "pt-1",
      )}
    >
      {label && (
        <div className="flex items-center px-3.5 py-1.5">
          <span className="truncate font-geist text-fig-caption-1 text-heading-06">
            {label}
          </span>
        </div>
      )}
      <div className="w-full rounded-16 border-fig border-border bg-surface-primary py-2.5">
        {children}
      </div>
      <div className="flex w-full items-center justify-between gap-1.5 px-3.5 py-1.5">
        {footer}
      </div>
    </div>
  );
}

/** One labelled field in an edit card: 10px label over a 30px control, each
 *  field an equal column (three to a row, so an add-form's extras wrap). */
export function EditField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-1 basis-1/3 flex-col justify-center gap-1 px-2 pb-1">
      <span className="font-geist text-fig-caption-2 text-heading-06">
        {label}
      </span>
      {children}
    </label>
  );
}

/** The Metric Input's text field: the standard 30px field with the
 *  input-active focus state, shared by every edit card. */
export function EditInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-field w-full rounded-8 border-fig border-border bg-surface-primary px-2 font-geist text-fig-caption-1 text-heading-02 shadow-field outline-none placeholder:text-caption-1 focus-visible:border focus-visible:border-blue-500 focus-visible:shadow-input-active focus-visible:ring-0 md:text-fig-caption-1",
        className,
      )}
      {...props}
    />
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

/** The Edit component (set 499:3506): a 12px pencil and 13/450 Heading-03,
 *  wearing the Foreground-01 wash on hover — and on keyboard focus, which the
 *  set cannot draw. */
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
      className="flex shrink-0 items-center gap-1.5 rounded-8 px-1 py-0.5 font-geist text-fig-body fig-w450 text-heading-03 outline-none hover:bg-surface-foreground-01 focus-visible:bg-surface-foreground-01"
    >
      <PencilGlyph className="size-3 text-icon-explainer" />
      {config.copy.actions.edit}
    </button>
  );
}

/** The Remove component (set 499:3536): trash and 12px Medium Red/600, the
 *  Red/50 wash on hover — THE bin-remove everywhere one exists, so the hover
 *  cannot drift between sites. */
export function RemoveButton({
  onClick,
  disabled = false,
  label,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  /** Accessible name — "Remove spend pace", not just "Remove". */
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-8 px-2.5 py-1.5 font-geist text-fig-button fig-medium text-red-600 outline-none hover:bg-red-50 focus-visible:bg-red-50 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <TrashGlyph className="shrink-0" />
      {config.copy.actions.remove}
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
