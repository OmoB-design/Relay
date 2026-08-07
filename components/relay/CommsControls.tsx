"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { config } from "@/lib/config";
import { DEFAULT_ANCHOR_TIME, type Cadence, type Channel } from "@/lib/types";
import { DAYS, DAY_LABEL } from "@/lib/clients/new-client";
import { Button } from "@/components/ui/button";
import { TokenSelect } from "@/components/relay/TokenSelect";
import { updateCommsAction } from "@/app/(app)/clients/[clientId]/actions";

/* Cadence & channel controls (design.md §4.2). Primary cadence + channel are
   editable; secondary cadence/note render read-only (they're seed nuance, not
   a daily edit). */

type Primary = Cadence["primary"];
/** Daily is not a free choice in this dropdown — a daily client-facing cadence
 *  is a permission (dailyToClient), granted deliberately, not a picker option. */
type Selectable = Exclude<Primary, "daily">;
const SELECTABLE: Selectable[] = ["weekly", "weekly-lite", "monthly"];
type AnchorDay = (typeof DAYS)[number];

export function CommsControls({
  clientId,
  cadence,
  channel,
  timezone,
}: {
  clientId: string;
  cadence: Cadence;
  channel: Channel;
  /** The client's account timezone — the clock the send time is read on. */
  timezone: string;
}) {
  const [primary, setPrimary] = useState<Selectable>(
    cadence.primary === "daily" ? "weekly" : cadence.primary,
  );
  const [chan, setChan] = useState<Channel>(channel);
  /* The send moment. Until a client has one, the admin's overview can only call
     it unscheduled — it has no threshold to measure "late" against. Defaults
     match the agency's standing arrangement: the Monday client update. */
  const [day, setDay] = useState<AnchorDay>(cadence.anchorDay ?? "mon");
  const [time, setTime] = useState(cadence.anchorTime ?? DEFAULT_ANCHOR_TIME);
  const [pending, startTransition] = useTransition();

  const dirty =
    primary !== cadence.primary ||
    chan !== channel ||
    day !== cadence.anchorDay ||
    time !== cadence.anchorTime;

  function save() {
    startTransition(async () => {
      await updateCommsAction({
        clientId,
        cadencePrimary: primary,
        channel: chan,
        anchorDay: day,
        anchorTime: time,
      });
      toast(config.copy.actions.saved);
    });
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-ui text-12 text-ink-soft">Cadence</span>
          <TokenSelect
            value={primary}
            onChange={(e) => setPrimary(e.target.value as Selectable)}
          >
            {SELECTABLE.map((v) => (
              <option key={v} value={v}>
                {config.copy.cadenceLabel[v]}
              </option>
            ))}
          </TokenSelect>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-ui text-12 text-ink-soft">Channel</span>
          <TokenSelect
            value={chan}
            onChange={(e) => setChan(e.target.value as Channel)}
          >
            {(Object.keys(config.copy.channelLabel) as Channel[]).map((v) => (
              <option key={v} value={v}>
                {config.copy.channelLabel[v]}
              </option>
            ))}
          </TokenSelect>
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-ui text-12 text-ink-soft">Send day</span>
          <TokenSelect
            value={day}
            onChange={(e) => setDay(e.target.value as AnchorDay)}
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {DAY_LABEL[d]}
              </option>
            ))}
          </TokenSelect>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-ui text-12 text-ink-soft">
            Send time · {timezone}
          </span>
          {/* The client's clock, not the agency's. A Dubai 09:00 passes five
              hours before a London one, and "late" is measured against theirs. */}
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-8 border-fig border-border bg-surface-primary px-2 py-1.5 font-geist text-fig-caption-1 text-heading-01 shadow-field"
          />
        </label>
      </div>
      {(cadence.secondary || cadence.note) && (
        <p className="font-ui text-12 text-ink-soft">
          {cadence.secondary &&
            `Also: ${config.copy.cadenceLabel[cadence.secondary]}. `}
          {cadence.note}
        </p>
      )}
      {dirty && (
        <div>
          <Button size="sm" onClick={save} disabled={pending}>
            {config.copy.actions.save}
          </Button>
        </div>
      )}
    </div>
  );
}
