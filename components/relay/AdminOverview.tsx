import Link from "next/link";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { DeliveryState, Overview } from "@/lib/admin/overview";
import { ClientAvatar } from "@/components/relay/ClientAvatar";

/* The admin's oversight surface.
   PROVISIONAL DESIGN, like TeamAdmin and AddClientForm — no Figma frame for the
   admin side yet, so this is assembled from the token layer.

   It answers three questions in the order they cost the agency money:
     1. DELIVERY — did this week's update go out, and if not, is it late yet?
     2. COVERAGE — is anyone actually on this client?
     3. RISK     — what is rotting quietly: unconfirmed rows, missing tracker
                   rows, open flags.

   Deliberately read-only. The admin only oversees; every fix belongs to the
   buyer who owns the client, so each row links to the work rather than
   offering to do it here. */

const t = config.copy.overview;

const CARD =
  "rounded-18 border-fig border-border bg-surface-primary p-4 shadow-card";
const ROW = "flex items-center gap-2.5 py-2";
const HINT = "font-geist text-fig-caption-2 text-caption-1";

/** One word, coloured. The states are ordered by urgency, so the colour is the
 *  fastest read on the page and the count beside each heading is the summary. */
const STATE_TONE: Record<DeliveryState, string> = {
  late: "bg-red-50 text-red-500",
  due: "bg-yellow-50 text-yellow-700",
  sent: "bg-green-50 text-green-500",
  unscheduled: "bg-surface-foreground-01 text-heading-05",
};

function Chip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-1 font-geist text-fig-caption-2",
        tone,
      )}
    >
      {children}
    </span>
  );
}

function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={CARD}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="font-geist text-fig-body fig-medium text-heading-01">
          {title}
        </h2>
        {count && <span className={HINT}>{count}</span>}
      </div>
      {children}
    </section>
  );
}

export function AdminOverview({ overview }: { overview: Overview }) {
  const { delivery, uncovered, coverage, risk } = overview;
  const late = delivery.filter((d) => d.state === "late");
  const sent = delivery.filter((d) => d.state === "sent");

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={t.deliveryTitle}
        count={
          `${sent.length}/${delivery.length} ${t.sentSuffix}` +
          (late.length > 0 ? ` · ${late.length} ${t.lateSuffix}` : "")
        }
      >
        <p className={HINT}>{t.deliveryBody}</p>
        {delivery.length === 0 ? (
          <p className="mt-3 font-geist text-fig-caption-1 text-heading-06">
            {t.noClients}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {delivery.map(({ client, buyers, state, dueLabel }) => (
              <li key={client.id} className={ROW}>
                <ClientAvatar
                  name={client.name}
                  logo={config.clientLogos[client.name]}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-geist text-fig-body fig-w450 text-heading-01 underline-offset-4 hover:underline"
                    >
                      {client.name}
                    </Link>
                    <Chip tone={STATE_TONE[state]}>{t.state[state]}</Chip>
                  </span>
                  <span className="font-geist text-fig-caption-1 text-heading-06">
                    {dueLabel}
                    {" · "}
                    {/* The zone is on every row because it is what makes the
                        time mean anything — 09:00 where the CLIENT is. */}
                    {client.accountTimezone}
                    {" · "}
                    {buyers.length === 0
                      ? t.nobody
                      : buyers.map((b) => b.name || b.email).join(", ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title={t.coverageTitle}
        count={
          uncovered.length > 0
            ? `${uncovered.length} ${t.uncoveredSuffix}`
            : t.allCovered
        }
      >
        <p className={HINT}>{t.coverageBody}</p>

        {uncovered.length > 0 && (
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {uncovered.map((c) => (
              <li key={c.id} className={ROW}>
                <ClientAvatar name={c.name} logo={config.clientLogos[c.name]} />
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="font-geist text-fig-body fig-w450 text-heading-01">
                    {c.name}
                  </span>
                  <Chip tone={STATE_TONE.late}>{t.uncovered}</Chip>
                </span>
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-3 flex flex-col gap-1">
          {coverage.length === 0 ? (
            <li className="font-geist text-fig-caption-1 text-heading-06">
              {t.noBuyers}
            </li>
          ) : (
            coverage.map(({ buyer, clients }) => (
              <li
                key={buyer.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-1"
              >
                <span className="font-geist text-fig-caption-1 text-heading-01">
                  {buyer.name || buyer.email}
                </span>
                <span className={HINT}>
                  {clients.length === 0
                    ? t.noClientsYet
                    : clients.map((c) => c.name).join(", ")}
                </span>
              </li>
            ))
          )}
        </ul>
      </Panel>

      <Panel title={t.riskTitle}>
        <p className={HINT}>{t.riskBody}</p>
        <p className="mt-1 flex flex-wrap gap-4">
          {[
            { href: "/overview/logs", label: config.copy.logs.title },
            { href: "/overview/review", label: config.copy.review.title },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-geist text-fig-caption-2 text-heading-02 underline underline-offset-4"
            >
              {l.label} →
            </Link>
          ))}
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <Metric
            label={t.riskTracker}
            value={risk.trackerProblems.length}
            detail={risk.trackerProblems
              .map((p) => p.client.name)
              .slice(0, 3)
              .join(", ")}
          />
          <Metric
            label={t.riskUnconfirmed}
            value={risk.unconfirmed.length}
            detail={risk.unconfirmed
              .map((u) => u.client.name)
              .slice(0, 3)
              .join(", ")}
          />
          <Metric label={t.riskFlags} value={risk.openFlags} />
        </dl>
      </Panel>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-14 border-fig border-border bg-surface-dashboard px-3 py-2.5">
      <dt className={HINT}>{label}</dt>
      <dd
        className={cn(
          "font-geist text-22 fig-sb",
          value > 0 ? "text-heading-01" : "text-heading-06",
        )}
      >
        {value}
      </dd>
      {detail && <p className={cn(HINT, "truncate")}>{detail}</p>}
    </div>
  );
}
