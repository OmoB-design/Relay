import { redirect } from "next/navigation";

/* The Phase 0 styleguide is superseded by the design catalogue, which covers
   everything it did plus the shadcn aliases, the full type scale, radius,
   motion, and Figma variable names. Kept as a redirect so existing links and
   bookmarks still land somewhere useful — two token pages would drift. */
export default function StyleguidePage() {
  redirect("/design/tokens");
}
