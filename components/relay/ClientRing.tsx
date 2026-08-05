import Image from "next/image";
import { cn } from "@/lib/utils";
import type { NarrativeStatus } from "@/lib/types";
import { initialsFor } from "@/components/relay/ClientAvatar";

/* The due row's client mark — Figma node 365:3027. A 35px ring around a 28px
   circular crop, a different shape from ClientAvatar's rounded tile.

   THE RING IS THE PIPELINE, AS A METER:

     drafted    empty   grey track only — Relay wrote it, nobody has looked
     reviewed   half    a human approved it; it hasn't gone out
     sent       full    done

   WHY THE EXPORTED PATH IS GONE. Figma draws the arc as one fixed ~78% path, in
   Red/Red 500, identical on all three rows — it could only ever depict one
   amount. A meter needs three, so the arc is now a stroked circle with a dash
   offset. The geometry is derived from that path rather than invented: its donut
   runs from r=15.348 to r=17.5, so the stroke is 2.152 wide centred at r=16.424,
   with the round caps the original arc had.

   THE RING AGREES WITH THE WORD. Blue while the work is in flight, green once it
   is sent — the same tones StatusMark gives the status word beside it, so a row
   never says two things at once. The hue change is legible precisely because it
   happens exactly at the last step: a full ring and a green ring are the same
   fact stated twice, not two facts. */

const CENTRE = 17.5;
const RADIUS = 16.424;
const STROKE = 2.152;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** How much of the ring each stage fills. */
export const RING_PROGRESS: Record<NarrativeStatus, number> = {
  drafted: 0,
  reviewed: 0.5,
  sent: 1,
};

/** And in which colour. Matches the status word: blue-400 at the send step, as
 *  the due frame draws it, green-500 once it is done. `drafted` fills nothing, so
 *  its tone is never painted. */
export const RING_TONE: Record<NarrativeStatus, string> = {
  drafted: "text-blue-400",
  reviewed: "text-blue-400",
  sent: "text-green-500",
};

export function ClientRing({
  name,
  logo,
  /** 0–1. Values outside that range are clamped rather than drawn wrong. */
  progress = 0,
  /** Tailwind text-* class for the filled part. */
  tone = "text-blue-400",
  className,
}: {
  name: string;
  /** Path under /public. Omit to render initials. */
  logo?: string;
  progress?: number;
  tone?: string;
  className?: string;
}) {
  const filled = Math.min(1, Math.max(0, progress));

  return (
    <span
      className={cn(
        "relative flex size-ring shrink-0 items-center justify-center",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        width={35}
        height={35}
        viewBox="0 0 35 35"
        fill="none"
        className="absolute inset-0"
      >
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r={RADIUS}
          strokeWidth={STROKE}
          className="stroke-surface-stroke"
        />
        {filled > 0 && (
          <circle
            cx={CENTRE}
            cy={CENTRE}
            r={RADIUS}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - filled)}
            /* Start at twelve o'clock. An SVG circle starts at three. */
            transform={`rotate(-90 ${CENTRE} ${CENTRE})`}
            className={cn("stroke-current", tone)}
          />
        )}
      </svg>

      <span className="relative flex size-ring-inner items-center justify-center overflow-hidden rounded-full bg-panel">
        {logo ? (
          <Image
            src={logo}
            alt=""
            width={28}
            height={28}
            /* Decorative: the client's name is the adjacent text, so announcing
               the logo would only repeat it. */
            aria-hidden="true"
            className="size-ring-inner object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="font-geist text-fig-caption-2 fig-medium text-heading-05"
          >
            {initialsFor(name)}
          </span>
        )}
      </span>
    </span>
  );
}
