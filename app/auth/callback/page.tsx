"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";

/* ============================================================================
   Where an invite or recovery link lands. This is the buyer's whole way in.

   WHY THIS IS A CLIENT PAGE AND NOT A ROUTE HANDLER — the bug this replaces.
   Supabase's default invite email points at GoTrue's own /verify endpoint, which
   verifies the token and then 303s here with the session in the URL FRAGMENT:

     /auth/callback?next=/auth/set-password#access_token=…&refresh_token=…

   A fragment is never sent to the server. The route handler that used to live
   here read `?code=`, found nothing, and bounced every invited buyer to
   /login?error=missing-code — with a perfectly good session sitting in the
   address bar it could not see. The auth log named it exactly:
   `login_method: "implicit"`. Only the browser can read a fragment, so reading
   it has to happen here.

   The tokens are then handed to /auth/callback/session, which writes the cookies
   SERVER-side — the same path signing in already takes. Writing them from the
   browser instead would leave two mechanisms setting one cookie with different
   options, which fails in ways that are miserable to trace.

   THREE SHAPES ARRIVE HERE, and all three are handled, because which one you get
   depends on a dashboard setting no one remembers changing:
     · #access_token + #refresh_token — implicit; Supabase's default templates
     · ?token_hash + ?type           — if the email template is customised
     · ?code                         — PKCE, e.g. a browser-initiated reset
   ========================================================================== */

const CARD =
  "rounded-18 border-fig border-border bg-surface-primary p-6 shadow-card";

/** Only ever redirect inside this app: `next` arrives from a URL. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/auth/set-password";
  }
  return raw;
}

type Payload =
  | { access_token: string; refresh_token: string }
  | { token_hash: string; type: string }
  | { code: string };

/** What the link is carrying, or null if it carries nothing usable. */
function readLink(url: URL): Payload | null {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const access = hash.get("access_token");
  const refresh = hash.get("refresh_token");
  if (access && refresh) {
    return { access_token: access, refresh_token: refresh };
  }

  const tokenHash = url.searchParams.get("token_hash");
  if (tokenHash) {
    return { token_hash: tokenHash, type: url.searchParams.get("type") ?? "invite" };
  }

  const code = url.searchParams.get("code");
  return code ? { code } : null;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const c = config.copy.auth;

  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const next = safeNext(url.searchParams.get("next"));

    /* GoTrue reports its own refusals in the fragment as well — an expired or
       already-used link never gets as far as a token. Its wording is aimed at
       developers, so it is logged rather than shown. */
    const denied =
      hash.get("error_description") ??
      hash.get("error") ??
      url.searchParams.get("error_description") ??
      url.searchParams.get("error");
    if (denied) {
      console.warn(`[auth] link refused by Supabase: ${denied}`);
      setError(c.expiredLink);
      return;
    }

    const payload = readLink(url);
    if (!payload) {
      setError(c.linkIncomplete);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/auth/callback/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (cancelled) return;
        if (!response.ok) {
          setError(c.expiredLink);
          return;
        }

        /* Take the tokens out of the address bar before going anywhere. They are
           live credentials, and the browser keeps history and hands the URL to
           anything reading document.referrer. */
        window.history.replaceState(null, "", url.pathname);
        router.replace(next);
        router.refresh();
      } catch {
        if (!cancelled) setError(c.linkFailed);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, c.expiredLink, c.linkIncomplete, c.linkFailed]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-geist text-22 fig-sb text-heading-01">Relay</p>
        <p className="font-geist text-fig-caption-1 text-heading-06">
          {error ? c.linkProblem : c.completingInvite}
        </p>
      </div>

      {error && (
        <div className={CARD}>
          <p className="font-geist text-fig-caption-1 text-red-700">{error}</p>
          <Link
            href="/login"
            className="mt-3 inline-block font-geist text-fig-caption-1 fig-medium text-blue-500"
          >
            {c.backToSignIn}
          </Link>
        </div>
      )}
    </div>
  );
}
