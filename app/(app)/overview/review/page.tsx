import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { getWeekReview, lastCompleteWeek, weekRange } from "@/lib/admin/review";
import { WeeklyReview } from "@/components/relay/WeeklyReview";
import { Button } from "@/components/ui/button";

/* The weekly review. NOT ON A SCHEDULE — there is no Friday job and no Sunday
   cron. The admin opens this when they have time, over whatever week they pick,
   which is what the spec asks for and what actually happens at an agency. */

export const dynamic = "force-dynamic";

const t = config.copy.review;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  await requireAdmin();

  /* Defaults to the last COMPLETE week: the current one is still accumulating,
     and reconciling a number that is going to change is not a review. */
  const requested = searchParams.week;
  const { start } = /^\d{4}-\d{2}-\d{2}$/.test(requested ?? "")
    ? weekRange(requested!)
    : lastCompleteWeek();

  const week = await getWeekReview(start);
  const shift = (days: number) =>
    format(addDays(parseISO(week.weekStart), days), "yyyy-MM-dd");

  const label = `${format(parseISO(week.weekStart), "d MMM")} – ${format(
    parseISO(week.weekEnd),
    "d MMM yyyy",
  )}`;

  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <header className="mb-8">
        <p className="font-geist text-fig-caption-1 uppercase tracking-wide text-heading-06">
          {config.copy.overview.title}
        </p>
        <h1 className="mt-1 font-geist text-28 fig-sb text-heading-01">
          {t.title}
        </h1>
        <p className="mt-2 max-w-column font-geist text-fig-caption-1 text-heading-06">
          {t.lede}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="fig" variant="outline" asChild>
            <Link href={`/overview/review?week=${shift(-7)}`}>← Previous</Link>
          </Button>
          <span className="font-geist text-fig-caption-1 fig-medium text-heading-01">
            {label}
          </span>
          <Button size="fig" variant="outline" asChild>
            <Link href={`/overview/review?week=${shift(7)}`}>Next →</Link>
          </Button>
          <Button size="fig" variant="ghost" asChild>
            <Link href="/overview">{config.copy.overview.title}</Link>
          </Button>
        </div>
      </header>

      {week.rows.length === 0 ? (
        <p className="font-geist text-fig-caption-1 text-heading-06">
          {t.noClients}
        </p>
      ) : (
        <WeeklyReview week={week} />
      )}
    </div>
  );
}
