import { NextResponse, type NextRequest } from "next/server";
import { getRequestClient } from "@/lib/supabase";

/* Where Supabase sends an invite or recovery link.

   The link carries a one-time code; exchanging it sets the session cookie. An
   invited buyer then has no password yet, so they land on /auth/set-password
   rather than on Today, where every action would fail the moment their temporary
   session lapsed. */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/set-password";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const sb = await getRequestClient();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    // Almost always an expired or already-used link. Say which, because the fix
    // is "ask for another invite", not "try again".
    return NextResponse.redirect(`${origin}/login?error=expired-link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
