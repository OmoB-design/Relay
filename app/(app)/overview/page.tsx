import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { getOverview } from "@/lib/admin/overview";
import { AdminOverview } from "@/components/relay/AdminOverview";
import { AdminFirstRun, adminSteps } from "@/components/relay/AdminFirstRun";
import { Button } from "@/components/ui/button";

/* The admin's oversight page. Its own route rather than a role-branch inside
   /today: the two answer different questions. Today is a queue of work you do;
   this is a report on work other people are doing, and the admin does none of
   it themselves.

   requireAdmin() redirects a buyer to /today, and RLS refuses the reads
   regardless — the redirect is for clarity, not for safety. */

export const dynamic = "force-dynamic";

const t = config.copy.overview;

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: { empty?: string };
}) {
  await requireAdmin();
  const overview = await getOverview();

  // ?empty=1 forces the first-run view for demos, without touching data — the
  // same switch Today carries, for the same reason.
  const forceEmpty = searchParams.empty === "1";

  const steps = adminSteps(
    forceEmpty
      ? { buyers: 0, clients: 0, uncovered: 0 }
      : {
          buyers: overview.coverage.length,
          clients: overview.delivery.length,
          uncovered: overview.uncovered.length,
        },
  );

  return (
    <div className="mx-auto max-w-column px-4 md:px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-geist text-fig-caption-1 uppercase tracking-wide text-heading-06">
            {t.title}
          </p>
          <h1 className="mt-1 font-geist text-28 fig-sb text-heading-01">
            {t.heading}
          </h1>
          <p className="mt-2 max-w-column font-geist text-fig-caption-1 text-heading-06">
            {t.lede}
          </p>
        </div>
        <Button size="fig" variant="outline" asChild>
          <Link href="/admin">{config.copy.admin.title}</Link>
        </Button>
      </header>

      <div className="flex flex-col gap-4">
        {/* Setup stays up while anything is outstanding — a half-set-up agency
            is the state most likely to look fine and behave badly. The panels
            appear as soon as there is a single client to report on, because an
            empty Coverage card is indistinguishable from a broken one. */}
        {steps.some((s) => !s.done) && <AdminFirstRun steps={steps} />}
        {!forceEmpty && overview.delivery.length > 0 && (
          <AdminOverview overview={overview} />
        )}
      </div>
    </div>
  );
}
