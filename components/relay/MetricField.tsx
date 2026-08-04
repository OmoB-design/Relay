import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/* One labelled metric cell — Figma "Metric Input" (node 305:12045).

   Cell:  flex-col · gap 4 · pb 4 · px 8
   Label: 10px/1.2 Regular · heading-06 · uppercase as authored
   Box:   px 8 · py 4 · radius 8 · 0.6px stroke · white · faint drop
   Value: 12px/1.4 Regular · heading-01

   THE BOX IS PRESENT WHEN READING, not only when editing. I had it the other way
   round on an earlier reading of the frames — `partial·open` renders values as
   plain text while `staged·open` and `edit·open` both box them. Two of three, and
   both of the frames that show a full row, so the box is the rule.

   An unavailable metric stays plain: a box implies a value belongs there. */

const BOX =
  "flex items-center rounded-8 border-fig border-border bg-surface-primary px-2 py-1 shadow-field";

export function MetricField({
  label,
  value,
  unavailable,
  editing,
  draft,
  onChange,
}: {
  label: string;
  /** Already formatted for display. Ignored while editing. */
  value: string;
  /** Why this metric is missing. Renders "n/a" with the reason on hover. */
  unavailable?: string;
  editing?: boolean;
  draft?: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-1 px-2 pb-1">
      <span className="font-geist text-fig-caption-2 text-heading-06">
        {label}
      </span>
      {editing ? (
        <Input
          inputMode="decimal"
          value={draft ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          aria-label={label}
          className={cn(
            // h-auto and md:text-fig-caption-1 override shadcn's h-9 / md:text-sm;
            // Figma derives the height from py-4 plus a 12px/1.4 line.
            BOX,
            "h-auto w-full font-geist text-fig-caption-1 text-heading-01 md:text-fig-caption-1",
            "focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:field-focus",
          )}
        />
      ) : unavailable ? (
        // Absent is stated, never rendered as a stand-in zero — and never boxed,
        // because a box implies a value belongs in it.
        <span
          title={unavailable}
          className="py-1 font-geist text-fig-caption-1 text-caption-1"
        >
          n/a
        </span>
      ) : (
        <span className={BOX}>
          <span className="min-w-0 flex-1 font-geist text-fig-caption-1 text-heading-01">
            {value}
          </span>
        </span>
      )}
    </div>
  );
}
