"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ClientProfile, Narrative, NarrativeStatus } from "@/lib/types";
import { SearchGlyph } from "@/components/relay/NavIcons";

/* ============================================================================
   The narratives panel (Figma "Narrative nav side", 552:5160) — a 300px wash
   column that extends the nav: search over the client's narratives, the
   Draft / Reviewed / Sent sections with live counts, the client's own summary
   card, then one card per narrative in the open section. The 55px icon rail
   the component also draws IS AppNav collapsed; only the panel lives here.
   ========================================================================== */

const STATUS_LABEL: Record<NarrativeStatus, string> = {
  drafted: "Draft",
  reviewed: "Reviewed",
  sent: "Sent",
};

const STATUSES: NarrativeStatus[] = ["drafted", "reviewed", "sent"];

const MONTH = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

/** "Feb - Jun": the months the client's narratives span (node 552:5019). */
function rangeLabel(narratives: Narrative[]): string {
  if (narratives.length === 0) return "—";
  const starts = narratives.map((n) => n.week.start).sort();
  const first = MONTH.format(new Date(`${starts[0]}T00:00:00Z`));
  const last = MONTH.format(
    new Date(`${starts[starts.length - 1]}T00:00:00Z`),
  );
  return first === last ? first : `${first} - ${last}`;
}

/** "Rowan" out of "Hi Rowan," — the person the narrative addresses. */
function recipientName(narrative: Narrative, profile: ClientProfile): string {
  const m = narrative.emailGreeting?.match(/^hi\s+([^,]+),?\s*$/i);
  if (m) return m[1];
  return profile.stakeholders[0]?.name ?? profile.name;
}

/** The status pill, per the set's three variants (552:5158). Draft is
 *  NEUTRAL — foreground-01 on the open card, dashboard on the rest.
 *  Reviewed and Sent are tinted (Blue/50+500, Green/50+500), and their
 *  hairline appears ONLY on the cards that are not open — the open card's
 *  pill sits borderless on white. */
function StatusPill({
  status,
  active,
}: {
  status: NarrativeStatus;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center rounded-full border-fig px-2 py-0.5 font-geist text-fig-caption-2 fig-w450",
        status === "drafted" &&
          (active
            ? "border-transparent bg-surface-foreground-01 text-heading-05"
            : "border-transparent bg-surface-dashboard text-heading-04"),
        status === "reviewed" && [
          "bg-blue-50 text-blue-500",
          active ? "border-transparent" : "border-blue-300",
        ],
        status === "sent" && [
          "bg-green-50 text-green-500",
          active ? "border-transparent" : "border-green-150",
        ],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function NarrativeSideNav({
  profile,
  narratives,
  activeId,
}: {
  profile: ClientProfile;
  narratives: Narrative[];
  activeId: string;
}) {
  const active = narratives.find((n) => n.id === activeId);
  const [section, setSection] = useState<NarrativeStatus>(
    active?.status ?? "drafted",
  );
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<NarrativeStatus, number> = {
      drafted: 0,
      reviewed: 0,
      sent: 0,
    };
    for (const n of narratives) c[n.status] += 1;
    return c;
  }, [narratives]);

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return narratives
      .filter((n) => n.status === section)
      .filter((n) => {
        if (!q) return true;
        const preview = n.claims[0]?.text ?? "";
        return [n.week.label ?? "", preview, recipientName(n, profile)]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [narratives, section, query, profile]);

  return (
    <aside
      aria-label="Narratives"
      className="hidden h-full w-narrative-side shrink-0 flex-col overflow-y-auto overscroll-contain border-l-fig border-border bg-surface-foreground-01 md:flex"
    >
      {/* Search + the three sections (552:4984). */}
      <div className="flex w-full flex-col gap-2 px-2 pb-2.5 pt-5">
        <label className="flex w-full items-center gap-1.5 rounded-8 bg-surface-foreground-02 px-2 py-2.5">
          <SearchGlyph className="shrink-0 text-icon-explainer" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search narratives"
            aria-label="Search narratives"
            className="w-full bg-transparent font-geist text-fig-caption-1-md fig-medium text-heading-05 outline-none placeholder:text-heading-05"
          />
        </label>
        <div className="flex w-full gap-1">
          {STATUSES.map((s) => {
            const current = section === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={current}
                onClick={() => setSection(s)}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-6 border-fig border-border px-2 py-1 font-geist text-fig-caption-1 whitespace-nowrap",
                  current
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-dashboard text-base-black hover:bg-surface-primary",
                )}
              >
                <span>{STATUS_LABEL[s]}</span>
                <span>[{counts[s]}]</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The client's summary card (552:5003). */}
      <div className="mt-2 w-full divider-t divider-b px-2 py-4">
        <div className="w-full rounded-18 bg-surface-foreground-01 shadow-card">
          <div className="flex w-full flex-col overflow-hidden rounded-18 border-fig border-border bg-surface-foreground-02 p-1">
            <div className="px-2.5 py-1.5">
              <span className="font-geist text-fig-caption-1 text-heading-06">
                {profile.name}
              </span>
            </div>
            <div className="w-full rounded-14 border-fig border-border bg-surface-dashboard py-4">
              <div className="flex w-full items-center justify-between px-2">
                <span className="flex items-end gap-1">
                  <span className="font-greeting text-fig-h6 fig-medium tracking-count text-blue-500">
                    {narratives.length}
                  </span>
                  <span className="font-geist text-fig-caption-1 text-heading-04">
                    {narratives.length === 1
                      ? "total narrative"
                      : "total narratives"}
                  </span>
                </span>
                <span className="font-greeting text-fig-h6 fig-medium tracking-range text-heading-04">
                  {rangeLabel(narratives)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* One card per narrative in the open section (552:5021 / 552:5041). */}
      <ul className="flex w-full flex-col">
        {cards.map((n) => {
          const isOpen = n.id === activeId;
          return (
            <li
              key={n.id}
              className={cn(
                "w-full divider-b px-2",
                isOpen ? "py-4" : "py-2",
              )}
            >
              <Link
                href={`/clients/${profile.id}/narratives/${n.id}`}
                className={cn(
                  "flex h-side-card w-full flex-col justify-center gap-3 rounded-10 px-2 pb-4 pt-2.5",
                  isOpen
                    ? "border-fig border-border bg-surface-primary shadow-side-card-active"
                    : "shadow-side-card hover:bg-surface-primary/60",
                )}
              >
                <span className="flex w-full items-center justify-end gap-1">
                  <StatusPill status={n.status} active={isOpen} />
                  <span
                    className={cn(
                      "flex items-center rounded-full bg-surface-foreground-01 px-1 py-0.5 font-geist text-fig-caption-2 fig-w450",
                      isOpen ? "text-heading-05" : "text-heading-04",
                    )}
                  >
                    {n.week.label ?? n.week.start}
                  </span>
                </span>
                <span className="flex w-full items-start gap-1.5">
                  <span className="flex size-avatar-well shrink-0 items-center justify-center rounded-full bg-surface-foreground-02 font-geist text-fig-body-lg fig-medium text-base-black">
                    {recipientName(n, profile).charAt(0).toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-geist text-fig-caption-1-md fig-medium text-heading-02">
                      {recipientName(n, profile)}
                    </span>
                    <span className="truncate font-geist text-fig-caption-1 text-heading-04">
                      {n.claims[0]?.text ?? ""}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {cards.length === 0 && (
          <li className="w-full px-4 py-6 font-geist text-fig-caption-1 text-heading-06">
            {query.trim()
              ? "No narratives match the search."
              : `Nothing in ${STATUS_LABEL[section]} yet.`}
          </li>
        )}
      </ul>
    </aside>
  );
}
