import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { getLogOversight, LOG_WINDOW_DAYS } from "@/lib/admin/logs";
import { LogGrid } from "@/components/relay/LogGrid";
import { Button } from "@/components/ui/button";

/* Daily-log oversight. Under /overview rather than /admin because it is a
   report, not a settings screen — /admin is where you change who works here. */

export const dynamic = "force-dynamic";

const t = config.copy.logs;

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  await requireAdmin();

  /* A window, not a page size. Two weeks is enough to see a habit form or
     break; a month of cells stops being readable at a glance, which is the
     only thing this view is for. */
  const requested = Number(searchParams.days);
  const days =
    Number.isFinite(requested) && requested >= 7 && requested <= 60
      ? Math.floor(requested)
      : LOG_WINDOW_DAYS;

  const oversight = await getLogOversight(days);

  return (
    <div className="mx-auto max-w-5xl px-5 md:px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-geist text-fig-caption-1 uppercase tracking-wide text-heading-06">
            {config.copy.overview.title}
          </p>
          <h1 className="mt-1 font-geist text-28 fig-sb text-heading-01">
            {t.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {[14, 30].map((n) => (
            <Button
              key={n}
              size="fig"
              variant={n === days ? "default" : "outline"}
              asChild
            >
              <Link href={`/overview/logs?days=${n}`}>{n} days</Link>
            </Button>
          ))}
          <Button size="fig" variant="ghost" asChild>
            <Link href="/overview">{config.copy.overview.title}</Link>
          </Button>
        </div>
      </header>

      <LogGrid oversight={oversight} />
    </div>
  );
}
