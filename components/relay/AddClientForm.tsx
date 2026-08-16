"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CircleAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { DEFAULT_ANCHOR_TIME, type Profile } from "@/lib/types";
import {
  createClientAction,
  trackerTabsAction,
} from "@/app/(app)/admin/clients/actions";
import {
  CADENCES,
  DAYS,
  DAY_LABEL,
  TIMEZONES,
  type TrackerTabsResult,
} from "@/lib/clients/new-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* Adding a client.
   PROVISIONAL DESIGN, like TeamAdmin — no Figma frame exists for the admin side
   yet, so this is assembled from the token layer rather than invented styling.

   WHY IT IS ONE SCREEN. Three of these fields are load-bearing in a way that is
   invisible once you get them wrong:

     · the TRACKER TAB is how Relay finds the numbers at all. Type it wrong and
       nothing fails — the tab matches no client, the client compiles with no
       data, and at 08:00 the next morning Today reports the row as absent. So
       the tab is checked against the live workbook while you type, here, where
       the person who knows the answer is standing.
     · the TIMEZONE decides when "yesterday" ends. A Dubai account rolls over at
       20:00 UTC; getting it wrong shifts every daily row by a day.
     · the ASSIGNMENT decides who can see any of it. A buyer sees only what is
       assigned to them and the admin only oversees, so a saved-but-unassigned
       client is invisible to the whole agency.

   None of the three is discoverable later from the app, which is why they are
   all on the creation screen rather than in a settings page nobody visits. */

const t = config.copy.addClient;

const CARD =
  "rounded-18 border-fig border-border bg-surface-primary p-4 shadow-card";
const FIELD =
  "h-auto rounded-8 border-fig border-border bg-surface-primary px-2 py-2 font-geist text-fig-caption-1 text-heading-01 md:text-fig-caption-1 shadow-field";
const LABEL = "font-geist text-fig-caption-1 fig-medium text-heading-01";
const HINT = "font-geist text-fig-caption-2 text-caption-1";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className={HINT}>{hint}</span>}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(FIELD, "appearance-none")}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const opts = <T extends string>(values: readonly T[]) =>
  values.map((v) => ({ value: v, label: v }));

/** What the workbook says about the tab currently typed. */
type TabState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "matched" }
  | { kind: "missing" }
  | { kind: "taken" }
  | { kind: "unreadable"; message: string };

export function AddClientForm({ buyers }: { buyers: Profile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [trackerTab, setTrackerTab] = useState("");
  /* Until the admin edits the tab, it follows the name — the two are the same
     string for most clients, and typing it twice is how they drift apart. */
  const [tabEdited, setTabEdited] = useState(false);
  const tab = tabEdited ? trackerTab : name;

  const [domain, setDomain] = useState("");
  const [descriptor, setDescriptor] = useState("");
  const [sourceOfTruth, setSourceOfTruth] = useState("Google Ads");
  const [currency, setCurrency] = useState("USD");
  const [accountTimezone, setAccountTimezone] = useState("Asia/Dubai");
  const [cadence, setCadence] = useState("weekly");
  const [anchorDay, setAnchorDay] = useState("mon");
  const [anchorTime, setAnchorTime] = useState(DEFAULT_ANCHOR_TIME);
  const [channel, setChannel] = useState("slack");
  const [buyerIds, setBuyerIds] = useState<string[]>([]);

  /* The workbook, fetched once. The tab list is small and changes when someone
     edits the spreadsheet, not while a form is open, so re-reading it on every
     keystroke would spend a Google API call to learn nothing. */
  const [workbook, setWorkbook] = useState<TrackerTabsResult | null>(null);
  const [workbookError, setWorkbookError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    trackerTabsAction().then((r) =>
      r.ok ? setWorkbook(r.data) : setWorkbookError(r.error),
    );
  }, []);

  const tabState: TabState = (() => {
    if (tab.trim() === "") return { kind: "idle" };
    if (workbookError) return { kind: "unreadable", message: workbookError };
    if (!workbook) return { kind: "checking" };
    const needle = tab.trim().toLowerCase();
    const found = workbook.tabs.find((x) => x.trim().toLowerCase() === needle);
    if (!found) return { kind: "missing" };
    if (workbook.taken.some((x) => x.trim().toLowerCase() === needle))
      return { kind: "taken" };
    return { kind: "matched" };
  })();

  /* `missing` and `taken` block submission; `unreadable` does not. If the
     workbook cannot be reached, refusing to create the client would make an
     outage at Google a reason nobody can onboard — and the unique index still
     catches a genuine collision at the insert. */
  const blocked = tabState.kind === "missing" || tabState.kind === "taken";
  /* `checking` blocks too, or the check is decorative: the workbook takes a
     second to answer and a fast typist can submit inside that window, which is
     precisely the typo the form exists to catch. The server re-checks anyway —
     this is what stops the button lying about it. */
  const submittable =
    name.trim() !== "" &&
    tab.trim() !== "" &&
    !blocked &&
    tabState.kind !== "checking";

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createClientAction({
        name: name.trim(),
        trackerTab: tab.trim(),
        domain: domain.trim() || undefined,
        descriptor: descriptor.trim() || undefined,
        sourceOfTruth,
        currency,
        accountTimezone,
        cadence: { primary: cadence, anchorDay, anchorTime },
        channel,
        buyerIds,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast(t.created);
      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={CARD}>
        <h2 className="mb-3 font-geist text-fig-body fig-medium text-heading-01">
          {t.identity}
        </h2>
        <div className="flex flex-col gap-4">
          <Field label={t.nameLabel} hint={t.nameHint}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD}
              placeholder="Northbrook"
            />
          </Field>

          <Field label={t.tabLabel} hint={t.tabHint}>
            <Input
              value={tab}
              onChange={(e) => {
                setTabEdited(true);
                setTrackerTab(e.target.value);
              }}
              className={cn(FIELD, blocked && "field-invalid")}
              list="tracker-tabs"
              placeholder="Northbrook"
            />
            {/* A datalist rather than a select: the workbook may hold tabs that
                are not clients at all (summaries, scratch), so the list is a
                suggestion and the typed value is what counts. */}
            <datalist id="tracker-tabs">
              {(workbook?.tabs ?? []).map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
            <TabStatus state={tabState} source={workbook?.source} />
          </Field>

          <Field label={t.domainLabel} hint={t.domainHint}>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className={FIELD}
              placeholder="northbrook.com"
            />
          </Field>

          <Field label={t.descriptorLabel} hint={t.descriptorHint}>
            <Input
              value={descriptor}
              onChange={(e) => setDescriptor(e.target.value)}
              className={FIELD}
              placeholder="DTC functional beverage brand"
            />
          </Field>
        </div>
      </section>

      <section className={CARD}>
        <h2 className="mb-3 font-geist text-fig-body fig-medium text-heading-01">
          {t.reporting}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.sourceLabel} hint={t.sourceHint}>
            <Select
              value={sourceOfTruth}
              onChange={setSourceOfTruth}
              options={opts(["Google Ads", "Triple Whale"])}
            />
          </Field>
          <Field label={t.currencyLabel}>
            <Select
              value={currency}
              onChange={setCurrency}
              options={opts(["USD", "EUR", "GBP", "AED"])}
            />
          </Field>
          <Field label={t.timezoneLabel} hint={t.timezoneHint}>
            <Select
              value={accountTimezone}
              onChange={setAccountTimezone}
              options={opts(TIMEZONES)}
            />
          </Field>
          <Field label={t.channelLabel}>
            <Select
              value={channel}
              onChange={setChannel}
              options={[
                { value: "slack", label: "Slack" },
                { value: "email", label: "Email" },
              ]}
            />
          </Field>
          <Field label={t.cadenceLabel}>
            <Select
              value={cadence}
              onChange={setCadence}
              options={opts(CADENCES)}
            />
          </Field>
          <Field label={t.anchorLabel} hint={t.anchorHint}>
            <div className="flex items-center gap-2">
              <Select
                value={anchorDay}
                onChange={setAnchorDay}
                options={DAYS.map((d) => ({ value: d, label: DAY_LABEL[d] }))}
              />
              {/* A real clock control rather than a dropdown of half-hours: the
                  send time is a threshold someone has agreed with a client, not
                  a value to pick off a list. */}
              <input
                type="time"
                value={anchorTime}
                onChange={(e) => setAnchorTime(e.target.value)}
                aria-label={t.timeLabel}
                className={cn(FIELD, "w-auto shrink-0")}
              />
            </div>
          </Field>
        </div>
      </section>

      <section className={CARD}>
        <h2 className="font-geist text-fig-body fig-medium text-heading-01">
          {t.coverLabel}
        </h2>
        <p className={cn(HINT, "mt-1")}>{t.coverHint}</p>

        {buyers.length === 0 ? (
          <p className="mt-3 font-geist text-fig-caption-1 text-heading-06">
            {t.coverEmpty}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {buyers.map((b) => {
              const on = buyerIds.includes(b.id);
              return (
                <li key={b.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-8 px-2 py-1.5 hover:bg-surface-foreground-01">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setBuyerIds((prev) =>
                          on ? prev.filter((x) => x !== b.id) : [...prev, b.id],
                        )
                      }
                    />
                    <span className="font-geist text-fig-caption-1 text-heading-01">
                      {b.name || b.email}
                    </span>
                    {b.name && (
                      <span className={HINT}>{b.email}</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {buyers.length > 0 && buyerIds.length === 0 && (
          <p className="mt-2 font-geist text-fig-caption-2 text-yellow-700">
            {t.coverNone}
          </p>
        )}
      </section>

      {error && (
        <p
          role="alert"
          className="font-geist text-fig-caption-1 text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="fig"
          onClick={submit}
          disabled={!submittable || pending}
        >
          {pending ? t.submitting : t.submit}
        </Button>
        <Button
          size="fig"
          variant="ghost"
          onClick={() => router.push("/admin")}
          disabled={pending}
        >
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}

/** One line under the tab field saying what the workbook knows. */
function TabStatus({
  state,
  source,
}: {
  state: TabState;
  source?: "live" | "fixture";
}) {
  if (state.kind === "idle") return null;

  const line = (tone: string, icon: ReactNode, text: string) => (
    <span
      className={cn(
        "flex items-center gap-1.5 font-geist text-fig-caption-2",
        tone,
      )}
    >
      {icon}
      {text}
    </span>
  );

  switch (state.kind) {
    case "checking":
      return line(
        "text-caption-1",
        <Loader2 aria-hidden className="size-3 animate-spin" />,
        "Checking the workbook…",
      );
    case "matched":
      return (
        <span className="flex flex-col gap-0.5">
          {line(
            "text-green-500",
            <Check aria-hidden className="size-3" />,
            t.tabMatched,
          )}
          {source === "fixture" && (
            <span className={cn(HINT, "text-yellow-700")}>{t.tabFixture}</span>
          )}
        </span>
      );
    case "missing":
      return line(
        "text-destructive",
        <CircleAlert aria-hidden className="size-3" />,
        t.tabMissing,
      );
    case "taken":
      return line(
        "text-destructive",
        <CircleAlert aria-hidden className="size-3" />,
        t.tabTaken,
      );
    case "unreadable":
      return line(
        "text-yellow-700",
        <CircleAlert aria-hidden className="size-3" />,
        t.tabUnreadable,
      );
  }
}
