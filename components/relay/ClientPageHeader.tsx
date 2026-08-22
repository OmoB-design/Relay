import Link from "next/link";
import { config } from "@/lib/config";
import type { ClientProfile } from "@/lib/types";
import { BackGlyph } from "@/components/relay/NavIcons";

/* The masthead on a client's own page — the 683:8146 revision of `Client/
   profile/buyer` (683:8154's header block).

   Three lines and nothing else: a 12px "Back" above, the client's name at
   29px Geist Medium tracked to −3% (683:8164), and a meta line that extends
   the list row's — cadence · channel · descriptor · source of truth —
   because arriving here IS drilling into that row, and the header should
   read as the row, opened. The revision darkens the meta line into
   heading-04 ink at 13px/450 (683:8167): on this page the captions are
   content, not whisper.

   The dots stay 4px Grey/200 (683:8169). 10px between all three lines, 18px
   to the tab bar below — which is a separate component, because the header
   does not own what the reader does next. */
export function ClientPageHeader({ client }: { client: ClientProfile }) {
  return (
    <header className="flex w-full flex-col items-start gap-2.5">
      <Link
        href="/clients"
        className="flex items-center gap-0.5 font-geist text-fig-caption-1 text-heading-06 hover:text-heading-01"
      >
        <BackGlyph className="text-icon-explainer" />
        {config.copy.clientProfile.back}
      </Link>
      <h1 className="w-full font-geist text-fig-h4 fig-sb tracking-title text-heading-01">
        {client.name}
      </h1>
      <p className="flex min-w-0 flex-wrap items-center gap-2.5 font-geist text-fig-body fig-w450 text-heading-04">
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
