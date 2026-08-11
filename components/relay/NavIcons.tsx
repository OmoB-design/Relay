/* The inlined Figma glyphs — the sidebar's set from node 357:2590, plus the
   section and empty-state marks from 357:2338 and 365:3405. Path data, viewBox
   and stroke widths are the exported values, unedited.

   WHY THESE ARE INLINE AND NOT <img src="/icons/…">. Figma exports each glyph
   with its colour baked in — #212121 on the selected item, #424242 on the
   resting ones, #777777 on the chevron. Three states would mean three files per
   icon, and the state would live in the asset instead of in the code. Inlining
   the same geometry with `currentColor` lets the token layer drive it: the only
   thing that changes is which of those three hexes the parent's text colour
   resolves to.

   The mark keeps its literal fill. It is brand artwork with no Figma variable
   behind it, so it should not inherit a text colour that happens to be nearby. */

type GlyphProps = { className?: string };

/** 14×14, the size every nav glyph is drawn at. */
const NAV_ICON = {
  width: 14,
  height: 14,
  viewBox: "0 0 14 14",
  fill: "none",
  strokeWidth: 1.16667,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const { strokeWidth, strokeLinecap, strokeLinejoin, ...NAV_SVG } = NAV_ICON;
const STROKE = { strokeWidth, strokeLinecap, strokeLinejoin } as const;

/** The brand mark. Figma exports it at 20px (357:2439) and 30px (366:4239) with
 *  proportionally scaled coordinates — the same artwork twice — so one viewBox
 *  rendered at either size is geometrically identical to both, and there is no
 *  second copy of the path to keep in step. */
export function RelayMark({
  className,
  size = 20,
}: GlyphProps & { size?: 20 | 30 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M18.6142 7.61189C17.91 6.90767 16.7653 6.90767 16.061 7.61189L14.2179 9.48456C14.147 9.158 13.9883 8.84656 13.7347 8.59322C13.3375 8.19611 12.8001 8.03111 12.2805 8.08211C12.2861 8.02267 12.2976 7.96467 12.2976 7.90411C12.2976 7.42122 12.1099 6.96822 11.7702 6.62911C11.3878 6.24611 10.8417 6.08633 10.3155 6.13511C10.3718 5.61022 10.2075 5.066 9.80625 4.66456C9.10203 3.96089 7.9567 3.962 7.25258 4.66456L5.18603 6.73111L5.56858 4.27611C5.62658 3.79756 5.4937 3.32456 5.19481 2.94422C4.89636 2.56556 4.46892 2.32467 3.99203 2.26767C3.02303 2.144 2.22658 2.76845 1.99003 3.80789L1.01558 8.21C0.515918 10.5641 1.2337 12.9859 2.93558 14.6873L4.30658 16.0583C5.43447 17.1862 6.93403 17.8074 8.5297 17.8074C10.1254 17.8074 11.6244 17.1862 12.7523 16.0583L18.6144 10.1649C18.9546 9.82522 19.1423 9.37167 19.1423 8.88889C19.1423 8.405 18.9545 7.95145 18.6142 7.61189Z"
        fill="#050505"
      />
    </svg>
  );
}

export function TodayGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      {/* The one glyph Figma draws at 1.17 rather than 1.16667. */}
      <path
        d="M2.44612 4.62778L6.52946 1.52445C6.8079 1.31289 7.1929 1.31289 7.47057 1.52445L11.5539 4.62778C11.7476 4.77478 11.8611 5.00422 11.8611 5.24689V11.0833C11.8611 11.9428 11.165 12.6389 10.3056 12.6389H3.69446C2.83501 12.6389 2.1389 11.9428 2.1389 11.0833V5.24689C2.1389 5.00345 2.25246 4.77478 2.44612 4.62778Z"
        stroke="currentColor"
        strokeWidth={1.17}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClientsGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path
        d="M4.47222 6.41705C5.33136 6.41705 6.02778 5.72094 6.02778 4.86149C6.02778 4.00205 5.33136 3.30594 4.47222 3.30594C3.61309 3.30594 2.91667 4.00205 2.91667 4.86149C2.91667 5.72094 3.61309 6.41705 4.47222 6.41705Z"
        stroke="currentColor"
        {...STROKE}
      />
      <path
        d="M7.47369 11.7619C7.88044 11.6258 8.11922 11.1833 7.96833 10.7827C7.43558 9.36872 6.07369 8.36228 4.47302 8.36228C2.87236 8.36228 1.51047 9.36872 0.97769 10.7827C0.826801 11.1841 1.06558 11.6266 1.47236 11.7619C2.22058 12.0116 3.24647 12.2504 4.4738 12.2504C5.70113 12.2504 6.72624 12.0116 7.47369 11.7619Z"
        stroke="currentColor"
        {...STROKE}
      />
      <path
        d="M9.33333 4.4726C10.1925 4.4726 10.8889 3.77649 10.8889 2.91705C10.8889 2.0576 10.1925 1.36149 9.33333 1.36149C8.4742 1.36149 7.77778 2.0576 7.77778 2.91705C7.77778 3.77649 8.4742 4.4726 9.33333 4.4726Z"
        stroke="currentColor"
        {...STROKE}
      />
      <path
        d="M10.2309 10.2568C11.0619 10.1768 11.7784 10.0033 12.334 9.81758C12.7408 9.68147 12.9796 9.23883 12.8287 8.83836C12.2959 7.42427 10.934 6.41783 9.33333 6.41783C8.68062 6.41783 8.07256 6.5933 7.5389 6.88761"
        stroke="currentColor"
        {...STROKE}
      />
    </svg>
  );
}

export function AnswerDeskGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path
        d="M6.80556 4.86111H11.0833C11.7273 4.86111 12.25 5.38378 12.25 6.02778V12.6389L10.1111 10.6944H6.80556C6.16156 10.6944 5.63889 10.1718 5.63889 9.52778V6.02778C5.63889 5.38378 6.16156 4.86111 6.80556 4.86111Z"
        stroke="currentColor"
        {...STROKE}
      />
      <path
        d="M9.31202 2.52778C9.0426 2.06484 8.54661 1.75 7.97222 1.75H3.30556C2.44642 1.75 1.75 2.4465 1.75 3.30556V10.3056L3.30556 8.89148"
        stroke="currentColor"
        {...STROKE}
      />
    </svg>
  );
}

export function LibraryGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path
        d="M6.80556 2.13889H5.25C4.82045 2.13889 4.47222 2.48711 4.47222 2.91667V11.0833C4.47222 11.5129 4.82045 11.8611 5.25 11.8611H6.80556C7.23511 11.8611 7.58333 11.5129 7.58333 11.0833V2.91667C7.58333 2.48711 7.23511 2.13889 6.80556 2.13889Z"
        stroke="currentColor"
        {...STROKE}
      />
      <path
        d="M3.69444 3.69444H2.91667C2.48711 3.69444 2.13889 4.04267 2.13889 4.47222V11.0833C2.13889 11.5129 2.48711 11.8611 2.91667 11.8611H3.69444C4.124 11.8611 4.47222 11.5129 4.47222 11.0833V4.47222C4.47222 4.04267 4.124 3.69444 3.69444 3.69444Z"
        stroke="currentColor"
        {...STROKE}
      />
      <path
        d="M9.43854 3.68194L8.32492 4.02973C7.9149 4.15779 7.68632 4.59399 7.81437 5.00401L9.7852 11.3145C9.91325 11.7246 10.3494 11.9531 10.7595 11.8251L11.8731 11.4773C12.2831 11.3492 12.5117 10.913 12.3836 10.503L10.4128 4.19249C10.2848 3.78247 9.84857 3.55389 9.43854 3.68194Z"
        stroke="currentColor"
        {...STROKE}
      />
      <path d="M8.50422 7.21156L11.1028 6.39956" stroke="currentColor" {...STROKE} />
      <path d="M4.47222 5.63889H7.58333" stroke="currentColor" {...STROKE} />
      <path d="M2.13889 6.80556H4.47222" stroke="currentColor" {...STROKE} />
      <path d="M0.777778 11.8611H13.2222" stroke="currentColor" {...STROKE} />
    </svg>
  );
}

/** The panel chevron. `direction` swaps the arrowhead — the only difference
 *  between Figma's two exports (357:2439 vs 360:2885). */
export function PanelToggleGlyph({
  className,
  direction,
}: GlyphProps & { direction: "collapse" | "expand" }) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path d="M9.13889 2.13889V11.8611" stroke="currentColor" {...STROKE} />
      <path
        d={
          direction === "collapse"
            ? "M6.02778 5.05556L4.08333 7L6.02778 8.94444"
            : "M4.47222 5.05556L6.41667 7L4.47222 8.94444"
        }
        stroke="currentColor"
        {...STROKE}
      />
      <path
        d="M11.0833 2.13889H2.91667C2.05756 2.13889 1.36111 2.83533 1.36111 3.69444V10.3056C1.36111 11.1647 2.05756 11.8611 2.91667 11.8611H11.0833C11.9424 11.8611 12.6389 11.1647 12.6389 10.3056V3.69444C12.6389 2.83533 11.9424 2.13889 11.0833 2.13889Z"
        stroke="currentColor"
        {...STROKE}
      />
    </svg>
  );
}

/** The pencil in the middle of "All caught up" (Figma 365:3405). Same 1.75 as
 *  the waiting mark — both stand alone rather than in a column. */
/** The profile rows' edit pencil (node 422:6601). CLOSE to Lucide's
 *  pencil-line and not it — the exported path differs, so it is carried
 *  verbatim rather than substituted. EditGlyph below is a different pencil
 *  (the due row's empty tile); they are separate Figma exports. */
export function PencilGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path
        d="M2.13889 11.8611C2.13889 11.8611 4.93812 11.4193 5.67467 10.6828C6.41123 9.94622 11.3734 4.98399 11.3734 4.98399C12.0244 4.33299 12.0244 3.27755 11.3734 2.62733C10.7224 1.97633 9.667 1.97633 9.01678 2.62733C9.01678 2.62733 4.05456 7.58955 3.31801 8.32611C2.58145 9.06267 2.13967 11.8619 2.13967 11.8619L2.13889 11.8611Z"
        stroke="currentColor"
        {...STROKE}
      />
      <path d="M7.77778 11.8611H11.8611" stroke="currentColor" {...STROKE} />
    </svg>
  );
}

/** The back arrow on a client's own page (node 453:2990) — 12px, drawn at
 *  Icon/Icon-Explainer and darkening with the label it sits beside. */
export function BackGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1.83315 6H10.1665"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.66648 8.83324L1.83315 5.99991L4.66648 3.16657"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The row chevron (node 418:5768). Same geometry in both states — the frame
 *  draws it #777777 at rest and #050505 on the hovered row, which is a text
 *  colour, not a second icon. currentColor lets the row own that. */
export function ChevronGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path
        d="M4.95833 11.9583L9.91667 7L4.95833 2.04167"
        stroke="currentColor"
        {...STROKE}
      />
    </svg>
  );
}

export function EditGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path
        d="M11.8545 2.14545C12.74 3.03095 12.74 4.46829 11.8545 5.35379L6.27667 10.9316C5.98617 11.2221 5.6245 11.431 5.22783 11.536L1.45833 12.5417L2.464 8.77212C2.57017 8.37545 2.77783 8.0138 3.06833 7.7233L8.64617 2.14545C9.53167 1.25995 10.969 1.25995 11.8545 2.14545Z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.8333 12.5417H8.75"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The speech mark beside "Waiting on you" (Figma 357:2338). Drawn at 1.75, a
 *  heavier stroke than the nav glyphs — it sits alone rather than in a column. */
export function WaitingGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path
        d="M7 0.875C3.61783 0.875 0.875 3.61667 0.875 7C0.875 8.26233 1.25883 9.436 1.91333 10.4102C1.69517 11.3155 1.36033 12.2197 0.875 13.125C2.2295 13.125 3.36933 12.9022 4.32017 12.4833C5.13217 12.8812 6.034 13.125 7 13.125C10.3822 13.125 13.125 10.3822 13.125 7C13.125 3.61783 10.3822 0.875 7 0.875Z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
