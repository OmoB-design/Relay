import Link from "next/link";

/* One row of Today's "Waiting on you" — an unanswered client question, with how
   long it has been sitting there. Age is the whole point of the row, so it is
   never truncated away.

   Extracted from Today for the same reason as DueRow: the state catalogue must
   render the component, not a copy of it. */

export function WaitingRow({
  clientId,
  clientName,
  question,
  age,
}: {
  clientId: string;
  clientName: string;
  question: string;
  /** Pre-formatted, e.g. "2 hours" — the caller owns the clock. */
  age: string;
}) {
  return (
    <li>
      <Link
        href={`/answer-desk?client=${clientId}`}
        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-foreground-01"
      >
        <span className="min-w-0">
          <span className="block font-geist text-fig-body text-heading-01">
            {clientName}
          </span>
          <span className="block truncate font-geist text-fig-caption-1 text-heading-06">
            {question}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap font-geist text-fig-caption-2 text-heading-06">
          {age} ago
        </span>
      </Link>
    </li>
  );
}
