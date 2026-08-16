"use client";

import { DialRoot } from "dialkit";
import "dialkit/styles.css";

/* The tweak panel for the workspace's interactions (dialkit). Dev only: the
   dials exist to TUNE the motion; production ships whatever values the tuning
   settles on as the hooks' defaults. */
export function WorkspaceDials() {
  if (process.env.NODE_ENV === "production") return null;
  /* Closed by default and in the bottom-left corner: the open 280px panel
     otherwise sits over the evidence rail and eats its clicks. */
  return <DialRoot position="bottom-left" defaultOpen={false} />;
}
