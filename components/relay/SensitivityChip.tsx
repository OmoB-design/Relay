import { cn } from "@/lib/utils";
import type { Sensitivity } from "@/lib/types";

/* A sensitivity as the profile frame draws it (node 425:6789): a Yellow/50
   pill with the constraint in Yellow/600 at 12px. No icon — the earlier
   ShieldAlert came from the pre-redesign chip, and the frame carries the
   meaning in the wash alone. The full "type: text" stays in the title
   attribute, because the TYPE matters to the narrative layer even though the
   frame does not print it. */
export function SensitivityChip({
  sensitivity,
  className,
}: {
  sensitivity: Sensitivity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-yellow-50 px-1.5 py-1 text-left font-geist text-fig-caption-1 text-yellow-600",
        className,
      )}
      title={`${sensitivity.type}: ${sensitivity.text}`}
    >
      {sensitivity.text}
    </span>
  );
}
