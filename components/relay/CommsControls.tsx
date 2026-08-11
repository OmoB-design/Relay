"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { config } from "@/lib/config";
import { DEFAULT_ANCHOR_TIME, type Cadence, type Channel } from "@/lib/types";
import { DAYS, DAY_LABEL } from "@/lib/clients/new-client";
import { Button } from "@/components/ui/button";
import { TokenSelect } from "@/components/relay/TokenSelect";
import { ProfileFooter, ProfileWell } from "@/components/relay/ProfileCard";
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
    <>
      <ProfileWell className="grid gap-x-2.5 gap-y-2 px-2 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-geist text-fig-caption-2 text-heading-06">
            Cadence
          </span>
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
          <span className="font-geist text-fig-caption-2 text-heading-06">
            Channel
          </span>
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
        <label className="flex flex-col gap-1">
          <span className="font-geist text-fig-caption-2 text-heading-06">
            Send day
          </span>
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
          {/* The 2px dot is the frame's (node 429:7096) — a size below even
              the chip dot, because both halves of this label are captions. */}
          <span className="flex items-center gap-1 font-geist text-fig-caption-2 text-heading-06">
            Send time
            <span
              aria-hidden="true"
              className="size-dot-xs shrink-0 rounded-full bg-grey-200"
            />
            {timezone}
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
        {(cadence.secondary || cadence.note) && (
          <p className="font-geist text-fig-caption-2 text-caption-1 sm:col-span-2">
            {cadence.secondary &&
              `Also: ${config.copy.cadenceLabel[cadence.secondary]}. `}
            {cadence.note}
          </p>
        )}
      </ProfileWell>
      {/* Always drawn, per the frame; enabled only once something changed —
          a Save that saves nothing teaches people to stop reading buttons. */}
      <ProfileFooter className="justify-end">
        <Button size="fig" onClick={save} disabled={pending || !dirty}>
          {config.copy.actions.save}
        </Button>
      </ProfileFooter>
    </>
  );
}
