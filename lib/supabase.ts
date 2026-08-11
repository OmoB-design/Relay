import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { perRequest } from "@/lib/per-request";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/* ============================================================================
   Two Supabase clients, and the boundary between them matters more than either.

   REQUEST CLIENT — what the app uses. Cookie-backed, so auth.uid() resolves to
   the signed-in buyer and every RLS policy applies. This is the default, because
   the safe thing should be what you get without asking for it.

   SERVICE CLIENT — bypasses RLS entirely. The nightly compile and the CLI
   scripts run with no user, so every policy would deny them; they genuinely need
   it. Reachable ONLY inside runWithServiceRole().

   WHY AsyncLocalStorage AND NOT A MODULE FLAG. A flag set by a cron request
   would still be set for the next user request served by the same instance —
   silently handing one buyer service-role access to every client in the agency.
   An async scope cannot leak that way: it exists only for the duration of the
   callback that opened it.
   ========================================================================== */

export type RelayClient = SupabaseClient<Database>;

const serviceScope = new AsyncLocalStorage<true>();

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env.local — see .env.local.example.`,
    );
  }
  return value;
}

/** Run `fn` with RLS bypassed. Cron routes and CLI scripts only. */
export function runWithServiceRole<T>(fn: () => Promise<T>): Promise<T> {
  return serviceScope.run(true, fn);
}

/** True while inside runWithServiceRole. */
export const isServiceContext = (): boolean => serviceScope.getStore() === true;

let serviceClient: RelayClient | null = null;

/** The service-role client, or the anon client when no service key is set.
 *
 *  The fallback exists because RLS lands in two steps. Before 0009_rls.sql the
 *  anon key can still read everything, so the compile and the CLI scripts work
 *  unchanged; after it, anon is denied and the failure names the missing key. The
 *  alternative — throwing here — would break every script the moment the auth
 *  tables went in, well before there was anything to protect. */
function getServiceClient(): RelayClient {
  if (serviceClient) return serviceClient;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  serviceClient = createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

/** The signed-in user's client. RLS applies. Requires a request scope.
 *
 *  Memoised per request: every data-layer call asks for one, and building a
 *  fresh client each time re-reads cookies and, more importantly, starts a new
 *  connection instead of reusing the keep-alive socket to Supabase. Same
 *  request, same cookies, same client — there is nothing to vary. */
export const getRequestClient = perRequest(async (): Promise<RelayClient> => {
  const store = await cookies();
  return createServerClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. The refresh happens in
            // middleware, which can, so this is safe to swallow.
          }
        },
      },
    },
  );
});

/** The client every data-layer call goes through.
 *
 *  Service role inside runWithServiceRole, the signed-in user everywhere else.
 *  Callers never choose — the scope does, which is what stops a page from
 *  accidentally reading past its own RLS. */
export async function getSupabase(): Promise<RelayClient> {
  return isServiceContext() ? getServiceClient() : getRequestClient();
}

/** True when Supabase env is present — lets the data layer choose its source. */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const hasServiceRoleKey = (): boolean =>
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
