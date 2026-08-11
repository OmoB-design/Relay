"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/* The browser-side client. Relay reads almost nothing from the browser — every
   screen is a server component and every write is a server action — so this
   exists for the one thing a server component structurally cannot do: hold an
   open socket and hear about a change it did not ask for.

   ANON KEY ONLY, and that is not a limitation to work around. The session
   travels in the cookie @supabase/ssr already manages, so a realtime
   subscription is scoped by exactly the same RLS as every other read. */
export function browserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
