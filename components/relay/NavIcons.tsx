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
/** The modal's close (node 446:2305) — exported paths, verbatim. */
export function CloseGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path d="M10.8889 3.11111L3.11111 10.8889" stroke="currentColor" {...STROKE} />
      <path d="M3.11111 3.11111L10.8889 10.8889" stroke="currentColor" {...STROKE} />
    </svg>
  );
}

/** The lookup-in-flight spinner (node 429:7966 via the Logo set): a faded
 *  ring with a solid quarter arc — drawn to rotate, so the SPIN lives on the
 *  element (animate-spin), not in the asset. Exported paths, verbatim. */
export function SpinnerGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        opacity={0.4}
        d="M7 13.2222C3.56914 13.2222 0.777778 10.4309 0.777778 7C0.777778 3.56914 3.56914 0.777778 7 0.777778C10.4309 0.777778 13.2222 3.56914 13.2222 7C13.2222 10.4309 10.4309 13.2222 7 13.2222ZM7 1.94444C4.21244 1.94444 1.94444 4.21244 1.94444 7C1.94444 9.78756 4.21244 12.0556 7 12.0556C9.78756 12.0556 12.0556 9.78756 12.0556 7C12.0556 4.21244 9.78756 1.94444 7 1.94444Z"
        fill="currentColor"
      />
      <path
        d="M12.6389 7.58333C12.3168 7.58333 12.0556 7.32208 12.0556 7C12.0556 4.21244 9.78756 1.94444 7 1.94444C6.67792 1.94444 6.41667 1.68319 6.41667 1.36111C6.41667 1.03903 6.67792 0.777778 7 0.777778C10.4309 0.777778 13.2222 3.56914 13.2222 7C13.2222 7.32208 12.961 7.58333 12.6389 7.58333Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** The logo card's remove trash (node 447:2440) — exported paths, verbatim. */
export function TrashGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path d="M1.83315 3.16657H10.1665" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 3.16685V1.83352C4.5 1.46685 4.79867 1.16685 5.16667 1.16685H6.83333C7.20133 1.16685 7.5 1.46685 7.5 1.83352V3.16685" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.91685 5.83343L5.06165 8.83343" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.08314 5.83343L6.93834 8.83343" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.13191 5.16629L8.90011 9.56629C8.86277 10.2797 8.27744 10.833 7.56877 10.833H4.43213C3.7228 10.833 3.13813 10.2796 3.10079 9.56629L2.869 5.16629" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The selected option's check (node 432:8675). Figma's export of this one is
 *  degenerate — a single-point path — so the glyph is drawn as the plain 10px
 *  check the frame renders, at the export's stroke colour and weight. */
export function CheckGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1.87 5.31L3.96 7.4L8.13 2.92"
        stroke="currentColor"
        strokeWidth={0.888889}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The send-time field's clock (node 429:7100) — exported paths, verbatim. */
export function ClockGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5.00015 9.02776C7.22464 9.02776 9.02793 7.22446 9.02793 4.99998C9.02793 2.7755 7.22464 0.972203 5.00015 0.972203C2.77567 0.972203 0.972377 2.7755 0.972377 4.99998C0.972377 7.22446 2.77567 9.02776 5.00015 9.02776Z"
        stroke="currentColor"
        strokeWidth={0.833333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 2.6389V5.00001L6.80556 6.25001"
        stroke="currentColor"
        strokeWidth={0.833333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The select field's dropdown arrow (node 429:7071) — 10px. Drawn by us
 *  because TokenSelect is appearance-none: the ONLY way to make a native
 *  select honour an exact 8px inner padding is to strip the OS chrome, and
 *  the OS arrow goes with it. */
export function SelectChevronGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1.45822 3.5417L4.99988 7.08336L8.54155 3.5417"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

/** The narratives panel's search glass (node 552:4987) — 14px, drawn at
 *  Icon/Icon-Explainer; currentColor so the field owns the tone. */
export function SearchGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12.25 12.25L9.05225 9.05225"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.02778 10.3056C8.39028 10.3056 10.3056 8.39028 10.3056 6.02778C10.3056 3.66528 8.39028 1.75 6.02778 1.75C3.66528 1.75 1.75 3.66528 1.75 6.02778C1.75 8.39028 3.66528 10.3056 6.02778 10.3056Z"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The evidence delta badges (nodes 545:3582 / 545:4037): a 12px tinted disc
 *  carrying a hairline arrow. The frame pairs green-up and red-down, but the
 *  DISC follows the delta's MEANING, not its direction — an up-arrow on a
 *  cost metric sits on the red disc — so the tint is the caller's. */
type DeltaGlyphProps = GlyphProps & { discClassName?: string };

export function DeltaUpGlyph({
  className,
  discClassName = "fill-green-100",
}: DeltaGlyphProps) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx={6} cy={6} r={6} className={discClassName} />
      <path
        d="M6 9.37496V3.37496"
        stroke="currentColor"
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.4375 5.43746L6 2.99996L3.5625 5.43746"
        stroke="currentColor"
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DeltaDownGlyph({
  className,
  discClassName = "fill-red-50",
}: DeltaGlyphProps) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx={6} cy={6} r={6} className={discClassName} />
      <path
        d="M6 2.62499V8.62499"
        stroke="currentColor"
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5625 6.56249L6 8.99999L8.4375 6.56249"
        stroke="currentColor"
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The Narrative Nav's Sent mark (node 557:6167): a circled check, 14px,
 *  drawn at Grey/300 beside the pill's Grey/400 label — the colour is the
 *  caller's via currentColor. Not CheckGlyph: different geometry, own export. */
export function SentCheckGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M7 12.6389C10.1143 12.6389 12.6389 10.1143 12.6389 7C12.6389 3.88573 10.1143 1.36111 7 1.36111C3.88573 1.36111 1.36111 3.88573 1.36111 7C1.36111 10.1143 3.88573 12.6389 7 12.6389Z"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.47222 7.19444L6.22222 9.13889L9.52778 4.86111"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The Narratives empty-state mark (node 592:7127): a speech bubble with a
 *  pencil at its corner — commentary waiting to be written. 14px, drawn at
 *  Icon/Icon-Explainer; currentColor. */
export function NarrativeEmptyGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12.5557 6.06426C12.1094 3.39633 9.7951 1.36111 7 1.36111C3.88578 1.36111 1.36111 3.88586 1.36111 7C1.36111 8.02573 1.63956 8.98489 2.1179 9.81314C2.45234 10.44 2.07667 11.9226 1.36111 12.6389C2.33333 12.6917 3.61433 12.2523 4.18678 11.882C4.56711 12.1015 5.16989 12.3924 5.95933 12.5417C6.07398 12.5633 6.19321 12.5722 6.31073 12.5857"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.7301 12.6033L13.1889 10.1446C13.4926 9.84083 13.4926 9.34834 13.1889 9.04462L12.7332 8.589C12.4295 8.28528 11.937 8.28528 11.6333 8.589L9.17459 11.0477L8.55563 13.2223L10.7301 12.6033Z"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The Eye set (588:6226) — the Narrative Nav's preview toggle, replacing the
 *  "Preview" text. Drawn at Grey/400; currentColor so hover darkens it. The
 *  icon shows the ACTION: the open eye offers the preview, the closed lid
 *  hides it. */
export function EyeOpenGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1.44629 6.22201C2.85796 4.78234 4.82496 3.88867 7.0004 3.88867C9.17584 3.88867 11.1428 4.78156 12.5545 6.22201"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.00022 10.3056C8.18149 10.3056 9.13911 9.348 9.13911 8.16672C9.13911 6.98545 8.18149 6.02783 7.00022 6.02783C5.81894 6.02783 4.86133 6.98545 4.86133 8.16672C4.86133 9.348 5.81894 10.3056 7.00022 10.3056Z"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.12723 4.92189L2.13867 3.30566"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.67764 4.00103L5.30664 2.15381"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.8721 4.92189L11.8606 3.30566"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.32227 4.00103L8.69327 2.15381"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EyeClosedGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1.44629 5.6543C2.85796 7.09396 4.82496 7.98763 7.0004 7.98763C9.17584 7.98763 11.1428 7.09474 12.5545 5.6543"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.12723 6.95508L2.13867 8.57052"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.67764 7.87598L5.30664 9.72242"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.8721 6.95508L11.8606 8.57052"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.32227 7.87598L8.69327 9.72242"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The Slack mark on the condensed preview (node 552:4658) — brand colours
 *  literal, same as Gmail's. */
export function SlackGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3.36506 10.0825C3.36506 11.0095 2.61588 11.7587 1.68888 11.7587C0.761875 11.7587 0.0126875 11.0095 0.0126875 10.0825C0.0126875 9.15556 0.761875 8.40637 1.68894 8.40637H3.365L3.36506 10.0825ZM4.20319 10.0825C4.20319 9.15556 4.95237 8.40637 5.87937 8.40637C6.80637 8.40637 7.55556 9.15556 7.55556 10.0826V14.273C7.55556 15.2 6.80637 15.9493 5.87931 15.9493C4.95244 15.9493 4.20319 15.2 4.20319 14.273V10.0825Z"
        fill="#E01E5A"
      />
      <path
        d="M5.87937 3.35238C4.95237 3.35238 4.20312 2.60319 4.20312 1.67619C4.20312 0.749188 4.95244 0 5.87937 0C6.80631 0 7.55556 0.749188 7.55556 1.67619V3.35244L5.87937 3.35238ZM5.87937 4.20319C6.80637 4.20319 7.55556 4.95237 7.55556 5.87937C7.55556 6.80637 6.80638 7.55556 5.87931 7.55556H1.67625C0.749187 7.55556 0 6.80638 0 5.87931C0 4.95244 0.749188 4.20319 1.67619 4.20319H5.87937Z"
        fill="#36C5F0"
      />
      <path
        d="M12.5969 5.87937C12.5969 4.95237 13.3461 4.20312 14.273 4.20312C15.1999 4.20312 15.9493 4.95237 15.9493 5.87937C15.9493 6.80637 15.2 7.55556 14.273 7.55556H12.5969V5.87937ZM11.7587 5.87937C11.7587 6.80637 11.0095 7.55556 10.0825 7.55556C9.15556 7.55556 8.40637 6.80638 8.40637 5.87931V1.67625C8.40637 0.749187 9.15556 0 10.0825 0C11.0094 0 11.7587 0.749188 11.7587 1.67619L11.7587 5.87937Z"
        fill="#2EB67D"
      />
      <path
        d="M10.0825 12.5969C11.0095 12.5969 11.7587 13.3461 11.7587 14.273C11.7587 15.1999 11.0095 15.9493 10.0825 15.9493C9.15556 15.9493 8.40637 15.2 8.40637 14.273V12.5969H10.0825ZM10.0825 11.7587C9.15556 11.7587 8.40637 11.0095 8.40637 10.0825C8.40637 9.15556 9.15556 8.40637 10.0826 8.40637H14.2857C15.2127 8.40637 15.9619 9.15556 15.9619 10.0826C15.9619 11.0096 15.2127 11.7587 14.2857 11.7587H10.0825Z"
        fill="#ECB22E"
      />
    </svg>
  );
}

/** The Gmail mark on the email preview (node 552:4646) — brand colours are
 *  literal on purpose; a logo does not take the theme. */
export function GmailGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={20}
      height={15}
      viewBox="0 0 20 15.0781"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4.54547 15.0039V7.27656L2.14898 5.08413L0 3.86749V13.6402C0 14.3948 0.611328 15.0039 1.36367 15.0039H4.54547Z"
        fill="#4285F4"
      />
      <path
        d="M15.4546 15.0039H18.6364C19.391 15.0039 20 14.3925 20 13.6402V3.86757L17.566 5.26108L15.4546 7.27655V15.0039Z"
        fill="#34A853"
      />
      <path
        d="M4.54545 7.27656L4.21936 4.25726L4.54545 1.36749L9.99999 5.45843L15.4545 1.36749L15.8193 4.10124L15.4545 7.27656L9.99999 11.3675L4.54545 7.27656Z"
        fill="#EA4335"
      />
      <path
        d="M15.4546 1.36751V7.27658L20 3.86751V2.04931C20 0.362983 18.075 -0.598345 16.7274 0.412983L15.4546 1.36751Z"
        fill="#FBBC04"
      />
      <path
        d="M0 3.86751L2.09055 5.43548L4.54547 7.27657V1.36751L3.27266 0.41298C1.92266 -0.598426 0 0.36298 0 2.04923V3.86751Z"
        fill="#C5221F"
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

/* --- The Answer Desk chatbox controls (node 615:12432) --- */

/** 16×16, the chatbox pair's shared frame: both buttons draw at 1.33333. */
const CHAT_ICON = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
} as const;

const CHAT_STROKE = {
  stroke: "currentColor",
  strokeWidth: 1.33333,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The add-media plus (615:11870). Exported paths, verbatim. */
export function PlusGlyph({ className }: GlyphProps) {
  return (
    <svg {...CHAT_ICON} aria-hidden="true" className={className}>
      <path d="M8 2.88839V13.1106" {...CHAT_STROKE} />
      <path d="M2.88895 8H13.1112" {...CHAT_STROKE} />
    </svg>
  );
}

/** The voice-input mic (615:11220). Exported paths, verbatim. */
export function MicGlyph({ className }: GlyphProps) {
  return (
    <svg {...CHAT_ICON} aria-hidden="true" className={className}>
      <path
        d="M13.5556 6.66629C13.5556 9.72941 11.0631 12.2219 8.00003 12.2219C4.93692 12.2219 2.44448 9.72941 2.44448 6.66629"
        {...CHAT_STROKE}
      />
      <path
        d="M10.8888 3.55518C10.8888 1.95972 9.59549 0.666295 7.99994 0.666295C6.40438 0.666295 5.11105 1.95972 5.11105 3.55518V6.66629C5.11105 8.26176 6.40438 9.55518 7.99994 9.55518C9.59549 9.55518 10.8888 8.26176 10.8888 6.66629V3.55518Z"
        {...CHAT_STROKE}
      />
      <path d="M8 12.2221V15.3332" {...CHAT_STROKE} />
      <path d="M8.66657 5.11161H10.8888" {...CHAT_STROKE} />
      <path d="M5.11105 15.3337H10.8888" {...CHAT_STROKE} />
    </svg>
  );
}

/** The send arrow (615:12079) — drawn white in the frame, currentColor here
 *  so the blue button's own text colour carries it. Exported paths, verbatim. */
export function SendArrowGlyph({ className }: GlyphProps) {
  return (
    <svg {...CHAT_ICON} aria-hidden="true" className={className}>
      <path d="M8 2.4442V13.5553" {...CHAT_STROKE} />
      <path d="M4.2221 6.22197L7.99988 2.4442L11.7777 6.22197" {...CHAT_STROKE} />
    </svg>
  );
}

/** The tip banner's dismiss (615:12410). A wider X than the modal's
 *  CloseGlyph — 2.625 insets against its 3.11 — so it is its own asset. */
export function TipDismissGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path d="M2.625 11.375L11.375 2.625" stroke="currentColor" {...STROKE} />
      <path d="M11.375 11.375L2.625 2.625" stroke="currentColor" {...STROKE} />
    </svg>
  );
}

/* --- The desk conversation's glyph set (nodes 619:15490 / 619:17022 /
       639:17444) — message meta controls, the agent's sparkles, and the chat
       sidebar's furniture. Exported paths, verbatim; currentColor throughout
       except the edit square's own two-tone fill. --- */

/** 12×12, the message meta row's size; drawn at 0.9. */
const META_ICON = {
  width: 12,
  height: 12,
  viewBox: "0 0 12 12",
  fill: "none",
} as const;

const META_STROKE = {
  stroke: "currentColor",
  strokeWidth: 0.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Re-run a message (619:15459). */
export function RetryGlyph({ className }: GlyphProps) {
  return (
    <svg {...META_ICON} aria-hidden="true" className={className}>
      <path
        d="M9.71124 8.5268C8.90184 9.71793 7.53571 10.5 5.98711 10.5C3.50184 10.5 1.48711 8.48527 1.48711 6C1.48711 3.51473 3.50184 1.5 5.98711 1.5C7.85091 1.5 9.44971 2.63307 10.1329 4.24747"
        {...META_STROKE}
      />
      <path
        d="M7.75313 4.14294L10.3083 4.49961L10.6623 1.94414"
        {...META_STROKE}
        strokeWidth={0.666667}
      />
    </svg>
  );
}

/** Copy a message (619:15465). */
export function CopyGlyph({ className }: GlyphProps) {
  return (
    <svg {...META_ICON} aria-hidden="true" className={className}>
      <path
        d="M8.333 3.75H9.75C10.578 3.75 11.25 4.422 11.25 5.25V9.75C11.25 10.578 10.578 11.25 9.75 11.25H5.25C4.422 11.25 3.75 10.578 3.75 9.75V8.25"
        {...META_STROKE}
      />
      <path
        d="M6.75 0.75H2.25C1.42157 0.75 0.75 1.42157 0.75 2.25V6.75C0.75 7.57843 1.42157 8.25 2.25 8.25H6.75C7.57843 8.25 8.25 7.57843 8.25 6.75V2.25C8.25 1.42157 7.57843 0.75 6.75 0.75Z"
        {...META_STROKE}
      />
    </svg>
  );
}

/** Take the answer back into the composer (619:16985). */
export function UndoGlyph({ className }: GlyphProps) {
  return (
    <svg {...META_ICON} aria-hidden="true" className={className}>
      <path
        d="M1.25014 5.74972H8.75014C9.85514 5.74972 10.7501 6.64472 10.7501 7.74972V9.74972"
        {...META_STROKE}
        strokeWidth={1}
      />
      <path
        d="M4.24986 9.00028L0.99986 5.75028L4.24986 2.50028"
        {...META_STROKE}
        strokeWidth={1}
      />
    </svg>
  );
}

/** Edit a sent question (619:15462) — the one meta glyph with its own fill:
 *  an 18px rounded square in Foreground-02 under a pencil at icon-system. */
export function EditSquareGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M0 6.4C0 4.15979 0 3.03968 0.435974 2.18404C0.819467 1.43139 1.43139 0.819467 2.18404 0.435974C3.03968 0 4.15979 0 6.4 0H11.6C13.8402 0 14.9603 0 15.816 0.435974C16.5686 0.819467 17.1805 1.43139 17.564 2.18404C18 3.03968 18 4.15979 18 6.4V11.6C18 13.8402 18 14.9603 17.564 15.816C17.1805 16.5686 16.5686 17.1805 15.816 17.564C14.9603 18 13.8402 18 11.6 18H6.4C4.15979 18 3.03968 18 2.18404 17.564C1.43139 17.1805 0.819467 16.5686 0.435974 15.816C0 14.9603 0 13.8402 0 11.6V6.4Z"
        fill="var(--color-surface-foreground-02)"
      />
      <path
        d="M4.5 13.4993C4.5 13.4993 7.09112 13.0903 7.77292 12.4085C8.45472 11.7267 13.048 7.13342 13.048 7.13342C13.6507 6.53082 13.6507 5.55384 13.048 4.95195C12.4454 4.34935 11.4685 4.34935 10.8666 4.95195C10.8666 4.95195 6.27325 9.54528 5.59145 10.2271C4.90966 10.9089 4.50072 13.5 4.50072 13.5L4.5 13.4993Z"
        stroke="var(--color-icon-system)"
        strokeWidth={0.971942}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The pencil from 619:15462 without its baked grey square — the meta row's
 *  icons are chromeless until hovered, so the box can't ride along. Ink on
 *  currentColor like every other row icon. */
export function EditPencilGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4.5 13.4993C4.5 13.4993 7.09112 13.0903 7.77292 12.4085C8.45472 11.7267 13.048 7.13342 13.048 7.13342C13.6507 6.53082 13.6507 5.55384 13.048 4.95195C12.4454 4.34935 11.4685 4.34935 10.8666 4.95195C10.8666 4.95195 6.27325 9.54528 5.59145 10.2271C4.90966 10.9089 4.50072 13.5 4.50072 13.5L4.5 13.4993Z"
        stroke="currentColor"
        strokeWidth={0.971942}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The agent's sparkles (619:16942) — "Thinking" while it works, "Thought Ns"
 *  once it has. The SPIN lives on the element, not in the asset. */
export function SparklesGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5.91812 3.57917L4.79545 3.20493L4.42123 2.08227C4.29945 1.7196 3.69945 1.7196 3.57767 2.08227L3.20345 3.20493L2.08079 3.57917C1.89945 3.63962 1.77679 3.8094 1.77679 4.00051C1.77679 4.19162 1.89945 4.3614 2.08079 4.42184L3.20345 4.79608L3.57767 5.91875C3.63812 6.10008 3.80879 6.22273 3.9999 6.22273C4.19101 6.22273 4.36079 6.10008 4.42212 5.91875L4.79634 4.79608L5.91901 4.42184C6.10034 4.3614 6.22301 4.19162 6.22301 4.00051C6.22301 3.8094 6.09945 3.63962 5.91812 3.57917Z"
        fill="currentColor"
      />
      <path
        d="M13.9181 11.5781L12.7955 11.2039L12.4212 10.0812C12.2995 9.71848 11.6995 9.71848 11.5777 10.0812L11.2035 11.2039L10.0808 11.5781C9.89945 11.6386 9.77679 11.8084 9.77679 11.9995C9.77679 12.1906 9.89945 12.3604 10.0808 12.4208L11.2035 12.795L11.5777 13.9177C11.6381 14.099 11.8088 14.2217 11.9999 14.2217C12.191 14.2217 12.3608 14.099 12.4221 13.9177L12.7963 12.795L13.919 12.4208C14.1003 12.3604 14.223 12.1906 14.223 11.9995C14.223 11.8084 14.0995 11.6386 13.9181 11.5781Z"
        fill="currentColor"
      />
      <path
        d="M5.33309 7.7779L5.92953 10.0703L8.22197 10.6668L5.92953 11.2632L5.33309 13.5557L4.73664 11.2632L2.4442 10.6668L4.73664 10.0703L5.33309 7.7779Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.888889}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6668 2.4442L11.2632 4.73662L13.5557 5.33309L11.2632 5.92955L10.6668 8.22197L10.0703 5.92955L7.7779 5.33309L10.0703 4.73662L10.6668 2.4442Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.888889}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The sidebar's Search chat magnifier (639:17195). */
export function SearchChatGlyph({ className }: GlyphProps) {
  return (
    <svg {...NAV_SVG} aria-hidden="true" className={className}>
      <path d="M12.25 12.25L9.05225 9.05225" stroke="currentColor" {...STROKE} />
      <path
        d="M6.02778 10.3056C8.39028 10.3056 10.3056 8.39028 10.3056 6.02778C10.3056 3.66528 8.39028 1.75 6.02778 1.75C3.66528 1.75 1.75 3.66528 1.75 6.02778C1.75 8.39028 3.66528 10.3056 6.02778 10.3056Z"
        stroke="currentColor"
        {...STROKE}
      />
    </svg>
  );
}

/** The client group's 8px chevron (639:17209), drawn at 0.8. */
export function GroupChevronGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={8}
      height={8}
      viewBox="0 0 8 8"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M2.83329 6.83352L5.66662 4.00019L2.83329 1.16685"
        stroke="currentColor"
        strokeWidth={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The chat row's 5px ring (639:17213) — grey-300 at 0.6, hollow. */
export function ChatDotGlyph({ className }: GlyphProps) {
  return (
    <svg
      width={5}
      height={5}
      viewBox="0 0 5 5"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx={2.5} cy={2.5} r={2.2} stroke="currentColor" strokeWidth={0.6} />
    </svg>
  );
}

/** The dropdown's Settings mark — the user's own dial-gear, verbatim paths
 *  (18 viewBox), inked by currentColor so the row's hover can take it. */
export function SettingsDialGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <line x1="6.25" y1="4.237" x2="9" y2="9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="6.25" y1="13.764" x2="9" y2="9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="14.5" y1="9" x2="9" y2="9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="9" y1="1.75" x2="9" y2="3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="2.721" y1="5.375" x2="4.237" y2="6.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="1.75" y1="9" x2="3.5" y2="9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="16.25" y1="9" x2="14.5" y2="9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="2.721" y1="12.625" x2="4.237" y2="11.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="9" y1="16.25" x2="9" y2="14.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="12.625" y1="15.279" x2="11.75" y2="13.763" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="5.375" y1="15.279" x2="6.25" y2="13.763" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="15.279" y1="12.625" x2="13.763" y2="11.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="15.279" y1="5.375" x2="13.763" y2="6.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="12.625" y1="2.721" x2="11.75" y2="4.237" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="5.375" y1="2.721" x2="6.25" y2="4.237" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

/** The dropdown's Sign out mark — the user's door-and-arrow, verbatim. */
export function SignOutDoorGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <line x1="2.75" y1="16.25" x2="15.25" y2="16.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="10.25" y1="9.25" x2="11.25" y2="9.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <polyline points="13.75 1.75 16.25 4.25 13.75 6.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="16" y1="4.25" x2="11.25" y2="4.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="m13.75,16.25v-6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="m9.6263,1.75h-3.8763c-.8284,0-1.5.6716-1.5,1.5v13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

/** The profile tile's expand mark (Icon/Expand 3776:3220) — verbatim vectors,
 *  stacked chevrons on currentColor; Figma inks it icon-explainer (#777). */
export function ExpandUpDownGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path d="M7.66907 3.83429L5.52179 1.68701L3.37451 3.83429" stroke="currentColor" strokeWidth="0.920262" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.66907 7.2085L5.52179 9.35577L3.37451 7.2085" stroke="currentColor" strokeWidth="0.920262" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
