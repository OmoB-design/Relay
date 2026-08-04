import { AuthCard } from "@/components/relay/AuthCard";

/* Where an invite link lands: set a password and give the name the header greets. */
export const dynamic = "force-dynamic";

export default function SetPasswordPage() {
  return <AuthCard mode="set-password" />;
}
