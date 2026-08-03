import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { NarrativeStatus } from "@/lib/types";

/* StatusStepper (design.md §3): drafted → reviewed → sent. Chips joined by 1px
   lines. completed = verdigris fill, current = verdigris outline, future = line.
   `compact` is the Today-row variant. */

const ORDER: NarrativeStatus[] = ["drafted", "reviewed", "sent"];

type StepState = "completed" | "current" | "future";

function stepStateFor(step: NarrativeStatus, current: NarrativeStatus): StepState {
  const si = ORDER.indexOf(step);
  const ci = ORDER.indexOf(current);
  if (si < ci) return "completed";
  if (si === ci) return "current";
  return "future";
}

export function StatusStepper({
  status,
  compact = false,
  className,
}: {
  status: NarrativeStatus;
  compact?: boolean;
  className?: string;
}) {
  return (
    <ol
      className={cn("flex items-center", className)}
      aria-label={`Status: ${config.copy.status[status]}`}
    >
      {ORDER.map((step, i) => {
        const state = stepStateFor(step, status);
        return (
          <li key={step} className="flex items-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px w-6",
                  stepStateFor(step, status) === "future"
                    ? "bg-line"
                    : "bg-verdigris",
                )}
              />
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border font-ui",
                compact ? "px-2 py-0.5 text-12" : "px-3 py-1 text-13",
                state === "completed" &&
                  "border-verdigris bg-verdigris text-white",
                state === "current" &&
                  "border-verdigris bg-verdigris-wash text-verdigris",
                state === "future" && "border-line bg-surface text-ink-soft",
              )}
            >
              {config.copy.status[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
