import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getRequestClient } from "@/lib/supabase";

/* Turns a verified link into a session cookie.
 *
 *  /auth/callback reads the link in the browser — it has to, the tokens arrive in
 *  a URL fragment — and posts what it found here. This is where the cookies are
 *  actually written, so that a session created by an invite is stored exactly
 *  like one created by signing in. One writer, one set of cookie options.
 *
 *  NOT A PRIVILEGE ESCALATION. Every branch below requires a credential Supabase
 *  already issued: an access token it signed, or a one-time token it mailed. A
 *  caller holding one of those can mint a session anyway — that is what the
 *  credential is for. This endpoint grants nothing that the token does not. */

export const dynamic = "force-dynamic";

const OTP_TYPES: readonly EmailOtpType[] = [
  "invite",
  "recovery",
  "signup",
  "magiclink",
  "email",
  "email_change",
];

const isOtpType = (v: unknown): v is EmailOtpType =>
  typeof v === "string" && (OTP_TYPES as readonly string[]).includes(v);

type Body = {
  access_token?: unknown;
  refresh_token?: unknown;
  token_hash?: unknown;
  type?: unknown;
  code?: unknown;
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const sb = await getRequestClient();

  const access = str(body.access_token);
  const refresh = str(body.refresh_token);
  const tokenHash = str(body.token_hash);
  const code = str(body.code);

  if (access && refresh) {
    const { error } = await sb.auth.setSession({
      access_token: access,
      refresh_token: refresh,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    /* setSession trusts the token it is handed unless it has already expired, so
       ask the auth server who this is. Without this a forged token would write a
       cookie here and fail confusingly on the next page instead of failing
       honestly now. */
    const { data, error: whoError } = await sb.auth.getUser();
    if (whoError || !data.user) {
      await sb.auth.signOut();
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }
  } else if (tokenHash) {
    const { error } = await sb.auth.verifyOtp({
      token_hash: tokenHash,
      type: isOtpType(body.type) ? body.type : "invite",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
  } else if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
  } else {
    return NextResponse.json(
      { error: "That link carried no credential." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
