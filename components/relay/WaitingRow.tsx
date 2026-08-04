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
        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper"
      >
        <span className="min-w-0">
          <span className="block font-display text-16 text-ink">
            {clientName}
          </span>
          <span className="block truncate font-ui text-14 text-ink-soft">
            {question}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap font-ui text-12 text-ink-soft">
          {age} ago
        </span>
      </Link>
    </li>
  );
}
