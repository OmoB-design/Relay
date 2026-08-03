"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { config } from "@/lib/config";
import type { Cadence, Channel } from "@/lib/types";
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

export function CommsControls({
  clientId,
  cadence,
  channel,
}: {
  clientId: string;
  cadence: Cadence;
  channel: Channel;
}) {
  const [primary, setPrimary] = useState<Selectable>(
    cadence.primary === "daily" ? "weekly" : cadence.primary,
  );
  const [chan, setChan] = useState<Channel>(channel);
  const [pending, startTransition] = useTransition();

  const dirty = primary !== cadence.primary || chan !== channel;

  function save() {
    startTransition(async () => {
      await updateCommsAction({
        clientId,
        cadencePrimary: primary,
        channel: chan,
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
