import { redirect } from "next/navigation";
import { getRequestClient } from "@/lib/supabase";
import { AuthCard } from "@/components/relay/AuthCard";

/* Where an invite finishes: choose a password, give the name the header greets.
 *
 *  The session already exists by the time anyone gets here — /auth/callback made
 *  it from the invite link. So a visitor WITHOUT one did not come from a link:
 *  it expired, it was already used, or they typed the URL. Say so on the sign-in
 *  page rather than showing a form that cannot succeed no matter what they type. */

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const sb = await getRequestClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login?error=expired-link");

  return <AuthCard mode="set-password" />;
}
