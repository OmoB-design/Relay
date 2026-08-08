"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { logoFor } from "@/lib/logos";
import { formatMetric } from "@/lib/metrics";
import {
  RECONCILED,
  type ReviewRow,
  type ReviewStatus,
  type WeekReview,
} from "@/lib/admin/review";
import { saveReviewAction } from "@/app/(app)/overview/review/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientAvatar } from "@/components/relay/ClientAvatar";

/* Reconciling a week. PROVISIONAL DESIGN — no Figma for the admin side.

   ONE CARD PER CLIENT, not a spreadsheet. The admin is making a judgement per
   client — do I believe these numbers — and a grid of inputs invites tabbing
   through without looking, which is exactly the behaviour a review exists to
   prevent.

   The delta is computed as you type, so the answer arrives before you have
   decided what to do about it. */

const t = config.copy.review;

const FIELD =
  "h-auto w-28 rounded-8 border-fig border-border bg-surface-primary px-2 py-1.5 font-geist text-fig-caption-1 text-heading-01 md:text-fig-caption-1 shadow-field";

const STATUS_TONE: Record<ReviewStatus, string> = {
  verified: "bg-green-50 text-green-500",
  discrepancy: "bg-red-50 text-red-600",
  pending: "bg-surface-foreground-01 text-heading-05",
};

const METRIC_LABEL: Record<(typeof RECONCILED)[number], string> = {
  spend: "Spend",
  sales: "Sales",
  revenue: "Revenue",
};

function pct(v: number) {
  const s = (v * 100).toFixed(1);
  return `${v > 0 ? "+" : ""}${s}%`;
}

export function WeeklyReview({ week }: { week: WeekReview }) {
  return (
    <div className="flex flex-col gap-4">
      {week.rows.map((row) => (
        <ReviewCard key={row.client.id} row={row} weekStart={week.weekStart} />
      ))}
    </div>
  );
}

function ReviewCard({ row, weekStart }: { row: ReviewRow; weekStart: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(row.note ?? "");
  const [actual, setActual] = useState<Record<string, string>>(
    Object.fromEntries(
      row.metrics.map((m) => [m.metric, m.actual?.toString() ?? ""]),
    ),
  );

  const live = row.metrics.map((m) => {
    const typed = actual[m.metric]?.trim();
    const parsed = typed === "" || typed === undefined ? undefined : Number(typed);
    const value = Number.isFinite(parsed) ? parsed : undefined;
    const deltaPct =
      m.logged === undefined || value === undefined || m.logged === 0
        ? undefined
        : (value - m.logged) / m.logged;
    return { ...m, actual: value, deltaPct, off: deltaPct !== undefined && Math.abs(deltaPct) > 0.005 };
  });

  const anyOff = live.some((m) => m.off);
  const anyEntered = live.some((m) => m.actual !== undefined);
  /* Suggested, never imposed. The numbers can say "off" for a reason the admin
     knows about and the app does not — a mid-week account change, a refund. */
  const suggested: ReviewStatus = anyOff
    ? "discrepancy"
    : anyEntered
      ? "verified"
      : "pending";

  function save(status: ReviewStatus) {
    setError(null);
    startTransition(async () => {
      const result = await saveReviewAction({
        clientId: row.client.id,
        weekStart,
        logged: Object.fromEntries(
          live.flatMap((m) => (m.logged === undefined ? [] : [[m.metric, m.logged]])),
        ),
        actual: Object.fromEntries(
          live.flatMap((m) => (m.actual === undefined ? [] : [[m.metric, m.actual]])),
        ),
        status,
        note: note.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast(t.saved);
      router.refresh();
    });
  }

  return (
    <section className="rounded-18 border-fig border-border bg-surface-primary p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2.5">
        <ClientAvatar
          name={row.client.name}
          logo={logoFor(row.client)}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-geist text-fig-body fig-w450 text-heading-01">
              {row.client.name}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-1 font-geist text-fig-caption-2",
                STATUS_TONE[row.status],
              )}
            >
              {t.status[row.status]}
            </span>
          </span>
          <span className="font-geist text-fig-caption-2 text-caption-1">
            {/* Source of truth is per client — Google Ads for most, Triple
                Whale for the ones whose new-customer metrics only it reports.
                Naming it says what the "actual" column is being read from. */}
            {row.client.sourceOfTruth}
            {" · "}
            {row.confirmedDays}/{row.loggedDays || 7} {t.confirmedDays}
            {row.buyers.length > 0 && (
              <> · {row.buyers.map((b) => b.name || b.email).join(", ")}</>
            )}
            {row.reviewerName && row.status !== "pending" && (
              <> · {t.reviewedBy} {row.reviewerName}</>
            )}
          </span>
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {live.map((m) => (
          <div
            key={m.metric}
            className="flex flex-col gap-1.5 rounded-14 border-fig border-border bg-surface-dashboard px-3 py-2.5"
          >
            <span className="font-geist text-fig-caption-2 text-caption-1">
              {METRIC_LABEL[m.metric]}
            </span>
            <span className="font-geist text-fig-caption-1 text-heading-01">
              {t.logged}{" "}
              {m.logged === undefined
                ? "—"
                : formatMetric(m.metric, m.logged)}
            </span>
            <label className="flex items-center gap-2">
              <span className="sr-only">
                {t.actual} {METRIC_LABEL[m.metric]}
              </span>
              <Input
                inputMode="decimal"
                placeholder={t.actual}
                value={actual[m.metric] ?? ""}
                onChange={(e) =>
                  setActual((prev) => ({ ...prev, [m.metric]: e.target.value }))
                }
                className={cn(FIELD, m.off && "field-invalid")}
              />
              {m.deltaPct !== undefined && (
                <span
                  className={cn(
                    "font-geist text-fig-caption-2",
                    m.off ? "text-red-600" : "text-green-500",
                  )}
                >
                  {pct(m.deltaPct)}
                </span>
              )}
            </label>
          </div>
        ))}
      </div>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className="font-geist text-fig-caption-2 text-caption-1">
          {anyOff ? t.noteRequired : t.noteOptional}
        </span>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.notePlaceholder}
          className={cn(FIELD, "w-full")}
        />
      </label>

      {error && (
        <p role="alert" className="mt-2 font-geist text-fig-caption-1 text-destructive">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="fig"
          variant={suggested === "discrepancy" ? "default" : "secondary"}
          onClick={() => save(suggested)}
          disabled={pending || !anyEntered}
        >
          {pending ? t.saving : t.markAs[suggested]}
        </Button>
        {/* The override. The suggestion is arithmetic; the judgement is not. */}
        {anyEntered && suggested !== "verified" && (
          <Button
            size="fig"
            variant="outline"
            onClick={() => save("verified")}
            disabled={pending}
          >
            {t.markAs.verified}
          </Button>
        )}
        {!anyEntered && (
          <span className="font-geist text-fig-caption-2 text-caption-1">
            {t.enterActuals}
          </span>
        )}
      </div>
    </section>
  );
}
