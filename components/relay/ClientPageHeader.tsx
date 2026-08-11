import Link from "next/link";
import { config } from "@/lib/config";
import type { ClientProfile } from "@/lib/types";
import { BackGlyph } from "@/components/relay/NavIcons";

/* The masthead on a client's own page — node 422:6294 inside `Client/profile/
   buyer` (417:3401).

   Three lines and nothing else: a 10px "Back" above, the client's name at H5,
   and a meta line that extends the list row's — cadence · channel · descriptor
   · source of truth — because arriving here IS drilling into that row, and the
   header should read as the row, opened.

   The dots are 4px here (node 422:5916) against the list's 5px: a third dot
   size, from the frame, not a slip. All three now live in the token layer.

   10px under the back link, 10px under the name (the frame's 22px offset is
   the 10px gap plus the label's own line box), 18px to the tab bar below —
   which is a separate component, because the header does not own what the
   reader does next. */
export function ClientPageHeader({ client }: { client: ClientProfile }) {
  return (
    <header className="flex w-full flex-col items-start gap-2.5">
      <Link
        href="/clients"
        className="flex items-center gap-0.5 font-geist text-fig-caption-2 text-heading-06 hover:text-heading-01"
      >
        <BackGlyph className="text-icon-explainer" />
        {config.copy.clientProfile.back}
      </Link>
      <h1 className="w-full font-greeting text-fig-h5 fig-medium text-heading-01">
        {client.name}
      </h1>
      <p className="flex min-w-0 flex-wrap items-center gap-2.5 font-geist text-fig-caption-1 text-heading-06">
        <span>{config.copy.cadenceLabel[client.cadence.primary]}</span>
        <span className="flex items-center gap-1.5">
          <Dot />
          {config.copy.channelLabel[client.channel]}
        </span>
        {client.descriptor && (
          <span className="flex items-center gap-1.5">
            <Dot />
            {client.descriptor}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Dot />
          {config.copy.clientProfile.sourcePrefix}
          {client.sourceOfTruth}
        </span>
      </p>
    </header>
  );
}

/** 4px, Grey/200 — the header's own dot size (422:5916). */
function Dot() {
  return (
    <span
      aria-hidden="true"
      className="size-dot-md shrink-0 rounded-full bg-grey-200"
    />
  );
}
