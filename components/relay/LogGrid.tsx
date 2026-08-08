import { format, parseISO } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { LogOversight, LogState } from "@/lib/admin/logs";

/* The accountability grid. PROVISIONAL DESIGN — no Figma for the admin side.
 *
 * A dense fortnight, one cell per client per day, grouped by the buyer who is
 * accountable for it. The states are colour-coded because the point of the
 * page is the SHAPE: a buyer who has stopped confirming shows up as a band of
 * empty cells long before anyone would notice it client by client.
 *
 * `notDue` is drawn as nothing at all rather than as a gap. A day that has not
 * ended in the client's timezone is not a day anyone is late for, and colouring
 * it would accuse a buyer of missing a deadline that has not arrived. */

const t = config.copy.logs;

/* Fills, not outlines. An outlined cell reads as an input you could type in,
   and there are two hundred of them on this page. Density is the whole point,
   so each state is one flat colour and the legend carries the meaning. */
const CELL: Record<LogState, string> = {
  confirmed: "bg-green-500",
  staged: "bg-yellow-100",
  missing: "bg-red-200",
  notDue: "bg-surface-foreground-01",
};

const LEGEND: { state: LogState; label: string }[] = [
  { state: "confirmed", label: t.confirmed },
  { state: "staged", label: t.staged },
  { state: "missing", label: t.missing },
  { state: "notDue", label: t.notDue },
];

export function LogGrid({ oversight }: { oversight: LogOversight }) {
  const { days, groups } = oversight;

  return (
    <section className="rounded-18 border-fig border-border bg-surface-primary p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-geist text-fig-body fig-medium text-heading-01">
          {t.title}
        </h2>
        <ul className="flex flex-wrap items-center gap-3">
          {LEGEND.map((l) => (
            <li
              key={l.state}
              className="flex items-center gap-1.5 font-geist text-fig-caption-2 text-caption-1"
            >
              <span
                aria-hidden="true"
                className={cn("size-2.5 rounded-4", CELL[l.state])}
              />
              {l.label}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-1 font-geist text-fig-caption-2 text-caption-1">
        {t.body}
      </p>

      {/* The grid is wider than a phone and that is fine — it scrolls inside
          its own box rather than making the page scroll sideways. */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface-primary pb-2 pr-3 text-left font-geist text-fig-caption-2 fig-medium text-heading-06">
                {t.clientColumn}
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  scope="col"
                  className="px-0.5 pb-2 text-center font-geist text-fig-caption-2 text-caption-1"
                >
                  {/* Two lines: the weekday letter carries the rhythm, the date
                      settles which day it actually is. */}
                  <span className="block">{format(parseISO(d), "EEEEE")}</span>
                  <span className="block">{format(parseISO(d), "d")}</span>
                </th>
              ))}
              <th className="pb-2 pl-3 text-right font-geist text-fig-caption-2 fig-medium text-heading-06">
                {t.confirmedColumn}
              </th>
            </tr>
          </thead>

          {groups.map((group) => (
            <tbody key={group.buyer?.id ?? "unassigned"}>
              <tr>
                <th
                  colSpan={days.length + 2}
                  scope="colgroup"
                  className="pb-1 pt-3 text-left font-geist text-fig-caption-1 fig-medium text-heading-01"
                >
                  {group.buyer
                    ? group.buyer.name || group.buyer.email
                    : t.unassigned}
                  {!group.buyer && (
                    <span className="ml-2 font-geist text-fig-caption-2 fig-regular text-yellow-700">
                      {t.unassignedNote}
                    </span>
                  )}
                </th>
              </tr>

              {group.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={days.length + 2}
                    className="py-1.5 font-geist text-fig-caption-2 text-caption-1"
                  >
                    {t.noClients}
                  </td>
                </tr>
              ) : (
                group.rows.map((row) => {
                  return (
                    <tr key={row.client.id}>
                      <td className="sticky left-0 z-10 bg-surface-primary py-1 pr-3">
                        <Link
                          href={`/clients/${row.client.id}`}
                          className="font-geist text-fig-caption-1 text-heading-01 underline-offset-4 hover:underline"
                        >
                          {row.client.name}
                        </Link>
                      </td>
                      {row.cells.map((cell) => (
                        <td key={cell.date} className="px-0.5 py-1">
                          <span
                            className={cn(
                              "block h-5 w-full min-w-4 rounded-4",
                              CELL[cell.state],
                            )}
                            /* The whole story of one cell, on hover: state,
                               who attested, and whether they changed a number. */
                            title={[
                              format(parseISO(cell.date), "EEE d MMM"),
                              t.state[cell.state],
                              cell.by,
                              cell.edited ? t.edited : undefined,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          />
                        </td>
                      ))}
                      <td
                        className={cn(
                          "py-1 pl-3 text-right font-geist text-fig-caption-2",
                          row.confirmed < row.due
                            ? "text-red-600"
                            : "text-heading-06",
                        )}
                      >
                        {row.confirmed}/{row.due}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
