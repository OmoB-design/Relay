"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import type { Profile } from "@/lib/types";
import { signOutAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

/* Who is signed in, and the way out. Provisional styling from the token layer —
   there is no Figma frame for the shell yet. */

export function AccountMenu({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <span className="flex flex-col gap-0.5 px-3">
        <span className="truncate font-geist text-fig-caption-1 text-heading-01">
          {profile.name.trim() || profile.email}
        </span>
        <span className="truncate font-geist text-fig-caption-2 text-caption-1">
          {profile.role === "admin" ? "Agency admin" : "Media buyer"}
        </span>
      </span>
      <Button
        size="fig"
        variant="ghost"
        disabled={pending}
        onClick={() => startTransition(() => signOutAction())}
        className="justify-start"
      >
        <LogOut aria-hidden="true" className="size-3" /> Sign out
      </Button>
    </div>
  );
}
