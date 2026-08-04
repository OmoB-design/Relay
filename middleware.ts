import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/* ============================================================================
   Session refresh and the front door.

   Two jobs, and the order matters. Supabase access tokens are short-lived, and
   only middleware can write the refreshed cookie back — a Server Component
   cannot set cookies. So every request passes through here to refresh, and the
   response carrying those cookies is what gets returned.

   Then the gate: an unauthenticated request to an app route is redirected to
   /login rather than rendering a shell full of empty sections. This is a
   convenience, NOT the security boundary — RLS is. Someone bypassing middleware
   reaches a database that still refuses to hand them rows.
   ========================================================================== */

/** Reachable without a session. Everything else needs one. */
const PUBLIC_PREFIXES = ["/login", "/auth", "/api/cron"];

/** Internal design tooling — no client data, so it stays open in development.
 *  It is noindex'd and never linked from the product. */
const OPEN_PREFIXES = ["/design", "/styleguide"];

const isPublic = (path: string): boolean =>
  [...PUBLIC_PREFIXES, ...OPEN_PREFIXES].some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Without env there is no auth to enforce; the data layer will raise its own
  // named error rather than this failing opaquely in middleware.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser(), not getSession(): it validates the token with the auth server
  // rather than trusting whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    // Come back to where they were headed once they are in.
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (user && pathname === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/today";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  // Everything except Next's internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logos/|.*\\.svg$).*)"],
};
