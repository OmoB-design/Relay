import { redirect } from "next/navigation";

// The app opens on Today (design.md §4.1). The Phase 0 styleguide remains
// available directly at /styleguide.
export default function Home() {
  redirect("/today");
}
