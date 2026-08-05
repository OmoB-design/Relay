import { config } from "@/lib/config";
import { AuthCard } from "@/components/relay/AuthCard";

/* Sign in. No registration form — Relay is invite-only, and an open signup on an
   internal agency tool is a different product.

   The notices matter more than they look. Everything that can go wrong upstream —
   a withdrawn account, a dead invite link — lands here, and landing on a bare
   login form with no explanation is how a broken invite reads as a broken app. */

export const dynamic = "force-dynamic";

const c = config.copy.auth;

/** `?error=` codes set by /auth/callback and /auth/set-password. */
const ERROR_NOTICES: Record<string, string> = {
  "expired-link": c.expiredLink,
  "link-incomplete": c.linkIncomplete,
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; revoked?: string; error?: string };
}) {
  const notice = searchParams.revoked
    ? "Your access has been withdrawn. Speak to your agency admin."
    : searchParams.error
      ? (ERROR_NOTICES[searchParams.error] ?? c.linkFailed)
      : undefined;

  return (
    <AuthCard mode="sign-in" next={searchParams.next} notice={notice} />
  );
}
