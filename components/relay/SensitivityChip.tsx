import { cn } from "@/lib/utils";
import type { Sensitivity } from "@/lib/types";

/* A sensitivity as the profile frame draws it (node 425:6789): a Yellow/50
   pill with the constraint in Yellow/600 at 12px — ON ONE LINE. The frame's
   text node is nowrap: a pill that wraps stops reading as a tag and starts
   reading as a paragraph with a stain under it. So the text truncates instead
   of wrapping when the well runs out of width, and the full "type: text"
   stays in the title attribute — which also serves the TYPE, which matters to
   the narrative layer even though the frame does not print it. */
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
        "inline-flex max-w-full items-center rounded-full bg-yellow-50 px-1.5 py-1 text-left font-geist text-fig-caption-1 text-yellow-600",
        className,
      )}
      title={`${sensitivity.type}: ${sensitivity.text}`}
    >
      <span className="truncate whitespace-nowrap">{sensitivity.text}</span>
    </span>
  );
}
