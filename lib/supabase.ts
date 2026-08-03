import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/* ============================================================================
   Typed Supabase client. Phases 0–5 read from seeded tables; no external API
   calls. Env vars live in .env.local (never committed).

   NOTE: the client is created lazily. Phase 0 ships schema.sql + seed.sql and a
   validated in-process seed (lib/seed.ts) so the app boots and the styleguide
   renders WITHOUT a live project. Once Bolaji provisions Supabase and sets the
   env vars, getSupabase() connects and lib/data.ts flips its source.
   ========================================================================== */

export type RelayClient = SupabaseClient<Database>;

let client: RelayClient | null = null;

export function getSupabase(): RelayClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase env not set. Add NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see supabase/schema.sql + seed.sql).",
    );
  }

  client = createClient<Database>(url, anonKey);
  return client;
}

/** True when Supabase env is present — lets the data layer choose its source. */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
