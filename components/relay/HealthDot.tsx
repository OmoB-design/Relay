import { cn } from "@/lib/utils";
import type { AccountHealth } from "@/lib/types";

/* Account health dot (design.md §4.2). Semantic color reuse: green = the
   completion accent, amber = flag, red = negative. */

const TONE: Record<AccountHealth, string> = {
  green: "bg-verdigris",
  amber: "bg-flag",
  red: "bg-negative",
};

export function HealthDot({
  health,
  label,
  className,
}: {
  health: AccountHealth;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label ?? `Health: ${health}`}
      title={label ?? `Health: ${health}`}
      className={cn("inline-block h-2 w-2 rounded-full", TONE[health], className)}
    />
  );
}
