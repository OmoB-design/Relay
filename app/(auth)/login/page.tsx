import { AuthCard } from "@/components/relay/AuthCard";

/* Sign in. No registration form — Relay is invite-only, and an open signup on an
   internal agency tool is a different product. */
export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; revoked?: string };
}) {
  return (
    <AuthCard
      mode="sign-in"
      next={searchParams.next}
      notice={
        searchParams.revoked
          ? "Your access has been withdrawn. Speak to your agency admin."
          : undefined
      }
    />
  );
}
