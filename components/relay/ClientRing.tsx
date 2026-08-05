import Image from "next/image";
import { cn } from "@/lib/utils";
import { initialsFor } from "@/components/relay/ClientAvatar";

/* The due row's client mark — Figma node 365:3027. A different shape from
   ClientAvatar's rounded tile: a 35px ring around a 28px circular crop.

   THE ARC IS UNEXPLAINED, and that matters. The frame draws two stacked
   ellipses: a full grey track (Surface/Stroke) and, over it, a ~78% arc in
   Red/Red 500. The sweep and the colour are IDENTICAL on all three rows —
   drafted, reviewed and sent — so nothing in the frame says what it measures.
   In this palette red means error or destructive, so a red ring on every client
   in the list reads as "all three are in trouble", which is unlikely to be the
   intent.

   It is drawn exactly as designed rather than guessed at or quietly dropped, and
   both the sweep and the tone are props so that binding it to something real —
   client health, week progress — is a one-line change once that is decided. The
   geometry is the exported path data, unedited: a 78% arc cannot be expressed as
   a border, so it stays an SVG path. */

/** Fraction of the ring the arc covers, as drawn in Figma. */
export const RING_ARC_AS_DRAWN = 0.78;

export function ClientRing({
  name,
  logo,
  /** Tailwind text-* class for the arc. Figma draws Red/Red 500. */
  arcTone = "text-red-500",
  /** Set false for the track alone, with no arc over it. */
  showArc = true,
  className,
}: {
  name: string;
  /** Path under /public. Omit to render initials. */
  logo?: string;
  arcTone?: string;
  showArc?: boolean;
  className?: string;
}) {
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
        className="absolute inset-0 text-surface-stroke"
      >
        {/* Ellipse 21 — the full track. */}
        <path
          d="M35 17.5C35 27.165 27.165 35 17.5 35C7.83502 35 0 27.165 0 17.5C0 7.83502 7.83502 0 17.5 0C27.165 0 35 7.83502 35 17.5ZM2.15158 17.5C2.15158 25.9767 9.0233 32.8484 17.5 32.8484C25.9767 32.8484 32.8484 25.9767 32.8484 17.5C32.8484 9.0233 25.9767 2.15158 17.5 2.15158C9.0233 2.15158 2.15158 9.0233 2.15158 17.5Z"
          fill="currentColor"
        />
      </svg>
      {showArc && (
        <svg
          aria-hidden="true"
          width={35}
          height={35}
          viewBox="0 0 35 35"
          fill="none"
          className={cn("absolute inset-0", arcTone)}
        >
          {/* Ellipse 22 — the arc. */}
          <path
            d="M15.942 1.07855C15.8896 0.526102 16.295 0.0327312 16.8496 0.0120987C20.1343 -0.110114 23.3947 0.695362 26.2527 2.34615C29.4015 4.16481 31.9055 6.91913 33.4168 10.2264C34.9281 13.5336 35.3717 17.2295 34.686 20.8004C34.0002 24.3714 32.2191 27.64 29.5902 30.1521C26.9614 32.6643 23.6152 34.2951 20.0168 34.8181C16.4184 35.341 12.7465 34.7301 9.5113 33.0702C6.27608 31.4103 3.63828 28.7838 1.96443 25.5558C0.445091 22.6257 -0.211544 19.3322 0.0596581 16.0563C0.105444 15.5033 0.616713 15.1207 1.16621 15.1981V15.1981C1.71571 15.2755 2.09496 15.7838 2.0533 16.3372C1.83784 19.1988 2.42135 22.0714 3.74843 24.6307C5.23007 27.4881 7.56496 29.8129 10.4287 31.2822C13.2924 32.7515 16.5426 33.2923 19.7278 32.8294C22.913 32.3665 25.8749 30.9229 28.2019 28.6993C30.5289 26.4756 32.1054 23.5823 32.7125 20.4214C33.3195 17.2605 32.9268 13.9891 31.589 11.0616C30.2512 8.13417 28.0348 5.69613 25.2476 4.08631C22.7512 2.64442 19.9081 1.9311 17.0396 2.01643C16.4849 2.03293 15.9944 1.631 15.942 1.07855V1.07855Z"
            fill="currentColor"
          />
        </svg>
      )}

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
