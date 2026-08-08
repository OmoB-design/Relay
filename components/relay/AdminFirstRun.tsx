import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";

/* The empty agency.
   PROVISIONAL DESIGN — no Figma frame for the admin side yet.

   WHY A CHECKLIST AND NOT AN EMPTY STATE. Today's empty states say "nothing to
   do", which is the truth there: the work simply has not arrived. Here the
   opposite is true — there is a great deal to do and none of it is visible,
   because every panel on this page reports on things that do not exist yet.
   An empty Coverage card is indistinguishable from a broken one.

   THE ORDER IS LOAD-BEARING, not decoration. Buyers come before clients because
   the add-client form assigns buyers on the same screen: do it the other way
   and the client is created with nobody on it, invisible to everyone, and the
   admin has to go back and fix it from a second page. The checklist encodes
   that so nobody has to learn it the hard way.

   It stays on screen while any step is outstanding, rather than vanishing the
   moment the first client exists — a half-set-up agency is the state most
   likely to look fine and behave badly. */

const t = config.copy.firstRun;

export type SetupStep = {
  title: string;
  body: string;
  href: string;
  cta: string;
  done: boolean;
};

export function adminSteps(counts: {
  buyers: number;
  clients: number;
  uncovered: number;
}): SetupStep[] {
  return [
    {
      title: t.inviteTitle,
      body: t.inviteBody,
      href: "/admin",
      cta: config.copy.admin.invite,
      done: counts.buyers > 0,
    },
    {
      title: t.clientTitle,
      body: t.clientBody,
      href: "/admin/clients/new",
      cta: config.copy.addClient.cta,
      done: counts.clients > 0,
    },
    {
      title: t.assignTitle,
      body: t.assignBody,
      href: "/admin",
      cta: t.assignCta,
      // Vacuously true with no clients would tick a box nobody has earned.
      done: counts.clients > 0 && counts.uncovered === 0,
    },
  ];
}

export function AdminFirstRun({ steps }: { steps: SetupStep[] }) {
  const next = steps.find((s) => !s.done);
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <section className="rounded-18 border-fig border-border bg-surface-primary p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-geist text-fig-body fig-medium text-heading-01">
          {t.title}
        </h2>
        <span className="font-geist text-fig-caption-2 text-caption-1">
          {steps.length - remaining}/{steps.length} {t.doneSuffix}
        </span>
      </div>
      <p className="mt-1 font-geist text-fig-caption-2 text-caption-1">
        {t.body}
      </p>

      <ol className="mt-3 flex flex-col divide-y divide-border">
        {steps.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3 py-3">
            {/* The marker carries the state, so the row reads without the copy. */}
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full font-geist text-fig-caption-2",
                step.done
                  ? "bg-green-50 text-green-500"
                  : "bg-surface-foreground-01 text-heading-05",
              )}
            >
              {step.done ? <Check className="size-3" /> : i + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "font-geist text-fig-caption-1 fig-medium",
                  step.done ? "text-heading-06" : "text-heading-01",
                )}
              >
                {step.title}
              </span>
              <span className="font-geist text-fig-caption-2 text-caption-1">
                {step.body}
              </span>
            </span>
            {/* Only the next outstanding step gets a button. Three buttons at
                once is three things to decide between; there is only one right
                move at any point in this list. */}
            {step === next && (
              <Button size="fig" asChild>
                <Link href={step.href}>{step.cta}</Link>
              </Button>
            )}
          </li>
        ))}
      </ol>

      {!next && (
        <p className="mt-1 font-geist text-fig-caption-1 text-heading-06">
          {t.complete}
        </p>
      )}
    </section>
  );
}
