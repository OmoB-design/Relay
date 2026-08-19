"use client";

import { DialRoot } from "dialkit";
import "dialkit/styles.css";

/* The Answer Desk's tweak panel (dialkit) — the desk's counterpart to
   WorkspaceDials. Dev only: the dials exist to TUNE the motion; production
   ships whatever values the tuning settles on as the hooks' defaults. */
export function DeskDials() {
  if (process.env.NODE_ENV === "production") return null;
  return <DialRoot position="bottom-left" defaultOpen={false} />;
}
