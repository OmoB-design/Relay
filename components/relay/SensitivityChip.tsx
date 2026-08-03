import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sensitivity } from "@/lib/types";

/* SensitivityChip (design.md §3): pill, flag-wash bg, flag-colored 12px Archivo
   text, leading ShieldAlert (14px). Always visible in the narrative review header
   — the buyer must SEE the constraints the draft was written under. */

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
        "inline-flex items-center gap-1.5 rounded-full bg-flag-wash px-3 py-1 font-ui text-12 text-flag",
        className,
      )}
      title={`${sensitivity.type}: ${sensitivity.text}`}
    >
      <ShieldAlert size={14} aria-hidden="true" className="shrink-0" />
      <span>{sensitivity.text}</span>
    </span>
  );
}
