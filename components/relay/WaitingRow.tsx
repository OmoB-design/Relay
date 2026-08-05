import Link from "next/link";
import { cn } from "@/lib/utils";

/* "Waiting on you" — Figma node 345:8233, both variants (one row / two).

   An unanswered client question, and how long it has been sitting there. The age
   is the whole point of the row, so it never truncates; the question does.

   TWO DEPARTURES:

   1. HAIRLINES. The frame nests five weights — 1px, 0.8, 0.7, 0.4, and a 0.5
      divider — across four concentric shells at the same 18px radius. Concentric
      hairlines at one radius stack into visible banding, which is the "too
      excessive" note from the last round, so they resolve to a single 0.7px
      border-fig on the card and one divider-b between rows, per globals.css.

   2. max-w-450 on the question. The frame pins the copy column to 450px to keep
      it off the age. `flex-1 min-w-0` with truncation does the same thing and
      survives a narrower column, which a fixed 450 does not. */

export function WaitingRow({
  clientId,
  clientName,
  question,
  age,
  /** Rows are separated by one hairline; the last one does not need a floor. */
  last = false,
}: {
  clientId: string;
  clientName: string;
  question: string;
  /** Pre-formatted, e.g. "2 days" — the caller owns the clock. */
  age: string;
  last?: boolean;
}) {
  return (
    <li className={cn(!last && "divider-b border-border")}>
      <Link
        href={`/answer-desk?client=${clientId}`}
        className="flex items-center justify-between gap-4 px-2 pb-3 pt-1.5 hover:bg-surface-foreground-01"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-geist text-fig-body fig-w450 text-heading-01">
            {clientName}
          </span>
          <span className="truncate font-geist text-fig-caption-1 text-heading-06">
            {question}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap font-geist text-fig-caption-2 text-heading-05">
          {age} ago
        </span>
      </Link>
    </li>
  );
}

/** The card the rows sit in: one white shell, one dashboard-fill well. */
export function WaitingList({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-18 border-fig border-border bg-surface-primary p-1 shadow-card">
      <ul className="overflow-hidden rounded-14 border-fig border-border bg-surface-dashboard">
        {children}
      </ul>
    </div>
  );
}
