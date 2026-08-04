import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/* One labelled metric cell in the digest grid — Figma "Metric Input"
   (node 305:12045), three variants:

     Filled   plain text, no chrome    → reading
     Default  bordered box             → editable, untouched
     Active   bordered box + blue ring → focused

   The frames were inconsistent about which to use when: `staged·open` showed
   bordered boxes with no currency symbols, `partial·open` plain text with them,
   `edit·open` bordered boxes with them. The rule agreed with the designer is
   BORDER MEANS YOU CAN TYPE HERE — plain for reading, bordered for editing —
   and currency always shows. */

export function MetricField({
  label,
  value,
  unavailable,
  editing,
  draft,
  onChange,
}: {
  label: string;
  /** Formatted for display. Ignored while editing. */
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
            "h-auto rounded-8 border-fig border-border bg-surface-primary px-2 py-1 shadow-none",
            "font-geist text-fig-caption-1 text-heading-05 md:text-fig-caption-1",
            "focus-visible:border-blue-500 focus-visible:ring-focus focus-visible:ring-0",
          )}
        />
      ) : unavailable ? (
        // Absent is stated, never rendered as a stand-in zero.
        <span
          title={unavailable}
          className="rounded-8 py-1 font-geist text-fig-caption-1 text-caption-1"
        >
          n/a
        </span>
      ) : (
        <span className="rounded-8 py-1 font-geist text-fig-caption-1 text-heading-05">
          {value}
        </span>
      )}
    </div>
  );
}
