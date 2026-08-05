"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type { Profile } from "@/lib/types";
import {
  inviteBuyerAction,
  setAssignmentAction,
  setBuyerStatusAction,
} from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* The agency admin's surface: invite a buyer, withdraw access, assign clients.

   PROVISIONAL DESIGN, like AuthCard — no Figma frame exists for admin yet, so
   this is built from the token layer rather than invented styling.

   Role-gated, not a separate app: one session, and the admin needs the same
   client list a buyer does. */

const CARD =
  "rounded-18 border-fig border-border bg-surface-primary shadow-card";
const FIELD =
  "h-auto rounded-8 border-fig border-border bg-surface-primary px-2 py-2 font-geist text-fig-caption-1 text-heading-01 md:text-fig-caption-1 shadow-field";

const a = config.copy.admin;

export type AdminClient = { id: string; name: string };

export function TeamAdmin({
  me,
  buyers,
  clients,
  assignments,
  pendingIds,
}: {
  me: Profile;
  buyers: Profile[];
  clients: AdminClient[];
  /** buyerId → clientIds they cover. */
  assignments: Record<string, string[]>;
  /** Invited, but has not finished /auth/set-password yet. */
  pendingIds: string[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast(done);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Invite ------------------------------------------------------------ */}
      <section className={cn(CARD, "flex flex-col gap-3 p-4")}>
        <h2 className="font-geist text-fig-body fig-medium text-heading-01">
          {a.invite}
        </h2>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            run(() => inviteBuyerAction(email), a.inviteSent);
            setEmail("");
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-geist text-fig-caption-2 text-heading-06">
              {config.copy.auth.emailLabel}
            </span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
          </label>
          <Button
            type="submit"
            size="fig"
            variant={pending ? "working" : "default"}
            disabled={pending || email.trim().length === 0}
          >
            {pending ? config.copy.daily.working : a.inviteCta}
          </Button>
        </form>
        {error && (
          <p className="font-geist text-fig-caption-2 text-red-700">{error}</p>
        )}
      </section>

      {/* Buyers + assignment ---------------------------------------------- */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-geist text-fig-body fig-medium text-heading-01">
            {a.assignTitle}
          </h2>
          <p className="font-geist text-fig-caption-1 text-heading-06">
            {a.assignBody}
          </p>
        </div>

        {buyers.length === 0 ? (
          <div className={cn(CARD, "px-4 py-6")}>
            <p className="font-geist text-fig-caption-1 text-heading-06">
              {a.noBuyers}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {buyers.map((b) => {
              const covered = assignments[b.id] ?? [];
              const revoked = b.status === "revoked";
              const isMe = b.id === me.id;
              const invited = pendingIds.includes(b.id);
              return (
                <li key={b.id} className={cn(CARD, "flex flex-col gap-3 p-4")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-geist text-fig-body fig-w450 text-heading-01">
                          {b.name.trim() || b.email}
                        </span>
                        {b.role === "admin" && (
                          <span className="rounded-full bg-blue-50 px-1.5 py-1 font-geist text-fig-caption-2 text-blue-500">
                            admin
                          </span>
                        )}
                        {revoked && (
                          <span className="rounded-full bg-yellow-100 px-1.5 py-1 font-geist text-fig-caption-2 text-yellow-700">
                            {a.revoked}
                          </span>
                        )}
                        {/* Revoked outranks invited: an invite that was withdrawn
                            before it was opened is withdrawn, not pending. */}
                        {invited && !revoked && (
                          <span className="rounded-full border-fig border-border px-1.5 py-1 font-geist text-fig-caption-2 text-heading-06">
                            {a.pending}
                          </span>
                        )}
                      </span>
                      <span className="font-geist text-fig-caption-1 text-heading-06">
                        {invited && !revoked ? a.pendingBody : b.email}
                      </span>
                    </span>
                    {/* An admin cannot revoke themselves — that is how an agency
                        locks itself out of its own tool. */}
                    {!isMe && (
                      <Button
                        size="fig"
                        variant={revoked ? "outline" : "ghost"}
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              setBuyerStatusAction(
                                b.id,
                                revoked ? "active" : "revoked",
                              ),
                            revoked ? a.restore : a.revoke,
                          )
                        }
                      >
                        {revoked ? a.restore : a.revoke}
                      </Button>
                    )}
                  </div>

                  {b.role !== "admin" && (
                    <div className="flex flex-wrap gap-1.5">
                      {clients.map((c) => {
                        const on = covered.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            disabled={pending}
                            aria-pressed={on}
                            onClick={() =>
                              run(
                                () => setAssignmentAction(c.id, b.id, !on),
                                on
                                  ? `${c.name} unassigned`
                                  : `${c.name} assigned`,
                              )
                            }
                            className={cn(
                              "rounded-full border-fig px-1.5 py-1 font-geist text-fig-caption-2",
                              on
                                ? "border-blue-500 bg-blue-50 text-blue-500"
                                : "border-border bg-surface-foreground-01 text-heading-06",
                            )}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
