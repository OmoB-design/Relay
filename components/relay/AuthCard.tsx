"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { signInAction, setPasswordAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* The front door. Two modes, one card.

   PROVISIONAL DESIGN. There is no Figma frame for auth yet, so this is built
   from the Figma token layer — Geist, the 0.7px hairline, radius 18, black
   primary — rather than invented styling. Layout is the plainest thing that
   works; replace it when the frame lands.

   Deliberately NO registration link. Relay is invite-only, and offering a
   "create an account" affordance on an internal agency tool teaches the wrong
   thing about what this is. */

const CARD =
  "rounded-18 border-fig border-border bg-surface-primary p-6 shadow-card";
const FIELD =
  "h-auto rounded-8 border-fig border-border bg-surface-primary px-2 py-2 font-geist text-fig-caption-1 text-heading-01 md:text-fig-caption-1 shadow-field";

export function AuthCard({
  mode,
  next,
  notice,
}: {
  mode: "sign-in" | "set-password";
  next?: string;
  notice?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const settingUp = mode === "set-password";
  const canSubmit = settingUp
    ? name.trim().length > 0 && password.length >= 8
    : email.trim().length > 0 && password.length > 0;

  function submit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = settingUp
        ? await setPasswordAction(name, password)
        : await signInAction(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(settingUp ? "/today" : (next ?? "/today"));
      router.refresh();
    });
  }

  const c = config.copy.auth;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-geist text-22 fig-sb text-heading-01">Relay</p>
        <p className="font-geist text-fig-caption-1 text-heading-06">
          {settingUp ? c.setUpBody : c.signInBody}
        </p>
      </div>

      <form
        className={cn(CARD, "flex flex-col gap-3")}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {notice && (
          <p className="rounded-8 bg-yellow-100 px-2 py-2 font-geist text-fig-caption-1 text-yellow-700">
            {notice}
          </p>
        )}

        {settingUp ? (
          <label className="flex flex-col gap-1">
            <span className="font-geist text-fig-caption-2 text-heading-06">
              {c.nameLabel}
            </span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={FIELD}
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="font-geist text-fig-caption-2 text-heading-06">
              {c.emailLabel}
            </span>
            <Input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={FIELD}
            />
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="font-geist text-fig-caption-2 text-heading-06">
            {settingUp ? c.newPasswordLabel : c.passwordLabel}
          </span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={settingUp ? "new-password" : "current-password"}
            className={FIELD}
          />
          {settingUp && (
            <span className="font-geist text-fig-caption-2 text-caption-1">
              {c.passwordHint}
            </span>
          )}
        </label>

        {error && (
          <p className="font-geist text-fig-caption-2 text-red-700">{error}</p>
        )}

        <Button
          type="submit"
          size="fig"
          variant={pending ? "working" : "default"}
          disabled={pending || !canSubmit}
        >
          {pending
            ? config.copy.daily.working
            : settingUp
              ? c.setUpCta
              : c.signInCta}
        </Button>
      </form>

      <p className="font-geist text-fig-caption-2 text-caption-1">
        {c.inviteOnly}
      </p>
    </div>
  );
}
