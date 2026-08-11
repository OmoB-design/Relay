import Link from "next/link";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { ClientProfile } from "@/lib/types";
import { ChevronGlyph } from "@/components/relay/NavIcons";

/* The client list — Figma node 417:3381 (`Client/List- buyer`), rows 418:4614.
 *
 *  SHELL. The frame stacks three shells: an 0.8px card at radius 18, an 0.5px
 *  one inside it at the same radius, then 4px of padding and rows carrying
 *  their own 0.4px border with the first and last rounded to 14. Concentric
 *  hairlines at one radius band into a thick edge, so — as with the digest and
 *  the empty panel — they resolve to ONE card hairline and ONE well hairline,
 *  per the single-weight rule in globals.css.
 *
 *  The rows' individual borders resolve the same way. Stacked with no gap they
 *  are a divider between rows, drawn once at the shared weight; the first and
 *  last corners come from the well's own radius and overflow-hidden, which is
 *  what Figma's rounded-t/rounded-b on the end rows describes.
 *
 *  HOVER IS THE CHEVRON, and only the chevron. The frame draws it #777777 at
 *  rest and #050505 on the row it is showing hovered, with no change to the row
 *  behind it — so this does not invent a background wash the design does not
 *  have. A focus ring is added because the frame cannot describe keyboard
 *  focus and a list of links without one is unusable from the keyboard. */

/* w-full for the same reason EmptyPanel carries it: every parent is a flex
   COLUMN with items-start, under which a child's width is shrink-to-fit. The
   frame draws this card at 550 (node 418:4608), not "as wide as the longest
   client name". */
const CARD =
  "w-full rounded-18 border-fig border-border bg-surface-primary shadow-card";
const WELL =
  "flex flex-col overflow-hidden rounded-14 border-fig border-border bg-surface-primary";

/** 5px, Grey/200 — the same separator the due row uses between two facts. */
function Dot() {
  return (
    <span
      aria-hidden="true"
      className="size-dot shrink-0 rounded-full bg-grey-200"
    />
  );
}

export function ClientList({ clients }: { clients: ClientProfile[] }) {
  return (
    <div className={CARD}>
      <div className="p-1">
        <ul className={WELL}>
          {clients.map((client, i) => (
            /* The HEIGHT SITS ON THE li, which is the element carrying the
               divider. Tailwind's box-sizing is border-box, so 55px here
               includes that hairline and every row measures the same; putting
               it on the link instead left each row after the first 1px taller,
               and four rows of that is a card 3px too tall. */
            <li
              key={client.id}
              className={cn(
                "h-client-row",
                i > 0 && "divider-t border-border",
              )}
            >
              <Link
                href={`/clients/${client.id}`}
                className="group flex h-full items-center justify-between gap-2 px-2.5 outline-none focus-visible:bg-surface-foreground-01"
              >
                <span className="flex min-w-0 max-w-client-text flex-1 flex-col gap-0.5">
                  <span className="truncate font-geist text-fig-body fig-w450 text-heading-01">
                    {client.name}
                  </span>
                  {/* Cadence · channel · descriptor. The descriptor is the one
                      that can run long, so it takes the remaining width and
                      truncates; the other two are facts of fixed length and
                      keep theirs. */}
                  <span className="flex min-w-0 max-w-client-meta items-center gap-2.5 font-geist text-fig-caption-1 text-heading-06">
                    <span className="shrink-0">
                      {config.copy.cadenceLabel[client.cadence.primary]}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Dot />
                      {config.copy.channelLabel[client.channel]}
                    </span>
                    {client.descriptor && (
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Dot />
                        <span className="truncate">{client.descriptor}</span>
                      </span>
                    )}
                  </span>
                </span>
                <ChevronGlyph className="size-nav-icon shrink-0 text-icon-explainer transition-colors group-hover:text-heading-01" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
