import { parseISO } from "date-fns";

/* ============================================================================
   The clock.

   Relay reads "now" through this module and nowhere else. Two modes:

     live  — the real system clock. The default, and what production runs on.
     pilot — a frozen instant, set via RELAY_PILOT_NOW.

   Pilot mode exists because the seed data describes a specific week (Mon 6 –
   Sun 12 Jul 2026). Demos need "yesterday" to mean Jul 12 and ages to read
   "2 hours ago" deterministically, every time, regardless of the real date.

   Freezing the clock in `config` was a latent production bug: the compile would
   have gone on asking for the same yesterday forever. Making it an explicit,
   env-gated mode means production is correct by default and demo mode has to be
   asked for on purpose.
   ========================================================================== */

/** ISO instant to freeze at, or undefined for the real clock. */
const PILOT_NOW = process.env.RELAY_PILOT_NOW?.trim() || undefined;

export const clockMode: "live" | "pilot" = PILOT_NOW ? "pilot" : "live";

/** The current instant. Every date calculation in Relay starts here. */
export function now(): Date {
  return PILOT_NOW ? parseISO(PILOT_NOW) : new Date();
}

/** The current instant as an ISO string. */
export function nowIso(): string {
  return now().toISOString();
}

/** True when the app is pinned to a demo instant — surfaced in the UI so a
 *  frozen clock is never mistaken for a broken one. */
export const isPilotClock = clockMode === "pilot";
