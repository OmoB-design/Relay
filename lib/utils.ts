import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/* ============================================================================
   cn — clsx, then tailwind-merge.

   TAILWIND-MERGE HAS TO BE TAUGHT OUR TOKENS, or it deletes them.

   It decides what a class means by looking the value up in its own table:
   `text-sm` is a size, `text-white` is a colour, `border-2` is a width,
   `border-red-500` is a colour. A custom token it has never heard of gets
   guessed — and it guessed wrong in three different ways here:

     text-primary-foreground  text-fig-button  ->  text-fig-button
     text-fig-caption-2       text-heading-05  ->  text-heading-05
     border-fig               border-border    ->  border-border

   The first dropped the COLOUR, so every filled button rendered with black
   inherited text instead of white. The second dropped the SIZE, so the
   absent-row chip rendered at body size instead of 10px. The third dropped the
   WIDTH, so every card border fell back to the browser default instead of the
   0.7px hairline — which is why the nested cards looked heavy.

   None of it surfaced in a typecheck, a build, or a grep: the classes were all
   present in the source, they simply never reached the DOM.

   Every custom utility and scale in app/globals.css is registered below. Adding
   one there without adding it here reintroduces exactly this class of bug, so
   scripts/verify-cn.ts asserts the whole table.
   ========================================================================== */

/** Custom font sizes: Figma's text styles, plus the legacy scale still in use
 *  on the screens awaiting redesign. */
const FONT_SIZES = [
  "fig-button",
  "fig-chat",
  "fig-greeting",
  "fig-h4",
  "fig-h5",
  "fig-h6",
  "fig-prose",
  "fig-body-lg",
  "fig-body",
  "fig-caption-1",
  // Longest-first is not required — the table is exact-match — but note that
  // caption-1 and caption-1-md are distinct sizes, not a prefix pair.
  "fig-caption-1-md",
  "fig-caption-2",
  "fig-body-sm",
  "12",
  "13",
  "14",
  "16",
  "18",
  "22",
  "28",
  "36",
];

/** Figma's Numbers/N radius scale, plus the client mark's two. */
const RADII = ["2", "4", "5", "6", "7", "8", "10", "12", "14", "16", "18", "20", "24"];

/** Border WIDTHS expressed as named utilities — these look like colours to
 *  tailwind-merge unless declared. */
const BORDER_WIDTHS = ["fig", "hair"];

/** box-shadow and drop-shadow utilities. */
const SHADOWS = [
  "card",
  "card-quiet",
  "popover",
  "field-active",
  "input-active",
  "invalid-active",
  "field",
  "control",
  "control-sm",
  "avatar",
  "avatar-well",
  "nav-profile",
  "sheet",
  "evidence-selected",
  "side-card",
  "side-card-active",
  "float-bar",
  "preview-pop",
  "sensitivity",
  "chatbox",
  "chatbox-active",
  "chatbox-float",
  "chatbox-float-active",
  "chat-control",
  "chat-group",
  "side-control",
];

/** Named font weights. Figma's Body-small ladder: Regular 450 / MD 470 / SB
 *  500 — plus the desk's two below-Regular reading weights. */
const FONT_WEIGHTS = [
  "fig-regular",
  "fig-w390",
  "fig-w420",
  "fig-w450",
  "fig-medium",
  "fig-sb",
];

/** Named heights, for the boxes Figma pins outright rather than deriving from
 *  their padding. `h-9` and friends must still be able to override them. */
const HEIGHTS = [
  "digest-row",
  "client-row",
  "profile-row",
  "button-fig",
  "field",
  "field-lg",
  "side-card",
  "nav-bar",
  "chip",
  "chatbox",
  "desk-pill",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
      rounded: [{ rounded: RADII }],
      "border-w": [{ border: BORDER_WIDTHS }],
      "border-w-b": ["divider-b"],
      "border-w-t": ["divider-t"],
      // field-focus / field-invalid are also box-shadow, so they share the group:
      // two of them on one element must never both apply.
      shadow: [{ shadow: SHADOWS }, "field-focus", "field-invalid"],
      "font-weight": FONT_WEIGHTS,
      h: [{ h: HEIGHTS }],
      "min-h": [{ "min-h": ["due-empty", "textarea"] }],
      "max-h": [{ "max-h": ["chat-cap", "dialog-cap"] }],
      tracking: [{ tracking: ["count", "range", "greeting", "chat"] }],
      gap: [{ gap: ["bar-gap"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
