import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRequestClient } from "@/lib/supabase";
import { config } from "@/lib/config";
import { ProfileSchema, type Profile } from "@/lib/types";
import { TeamAdmin, type AdminClient } from "@/components/relay/TeamAdmin";
import { MarkTeamSeen } from "@/components/relay/MarkTeamSeen";
import { Button } from "@/components/ui/button";

/* Agency admin. Role-gated rather than a separate app: one session, and the
   admin needs the same client list a buyer does.

   requireAdmin() redirects a buyer to /today. RLS refuses the reads below in any
   case, so a buyer who reached this URL would see nothing even without the
   redirect — the redirect is for clarity, not for safety. */

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireAdmin();
  const sb = await getRequestClient();

  const [profiles, clients, assignments] = await Promise.all([
    sb.from("profiles").select("*").order("created_at"),
    sb.from("clients").select("id, name").order("name"),
    sb.from("client_assignments").select("client_id, buyer_id, permission"),
  ]);

  const buyers: Profile[] = (profiles.data ?? []).flatMap((r) => {
    const parsed = ProfileSchema.safeParse({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      status: r.status,
    });
    return parsed.success ? [parsed.data] : [];
  });

  const byBuyer: Record<string, Record<string, "view" | "edit">> = {};
  for (const row of assignments.data ?? []) {
    (byBuyer[row.buyer_id] ??= {})[row.client_id] =
      row.permission === "view" ? "view" : "edit";
  }

  /* Invited but not yet arrived. The row exists from the moment the invite is
     sent — Supabase creates the auth user there and then — so without this an
     unopened invite is indistinguishable from a colleague of two years. */
  const pendingIds = (profiles.data ?? [])
    .filter((r) => r.accepted_at === null)
    .map((r) => r.id);

  /* Accepted since this admin last opened Team. Both halves are already in the
     rows above, so this costs no extra query. */
  const seenAt =
    (profiles.data ?? []).find((r) => r.id === me.id)?.team_seen_at ?? null;
  const newJoinIds = (profiles.data ?? [])
    .filter(
      (r) =>
        r.id !== me.id &&
        r.accepted_at !== null &&
        (seenAt === null || r.accepted_at > seenAt),
    )
    .map((r) => r.id);

  return (
    <div className="mx-auto max-w-column px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-geist text-fig-caption-1 uppercase tracking-wide text-heading-06">
            {config.copy.admin.title}
          </p>
          <h1 className="mt-1 font-geist text-28 fig-sb text-heading-01">
            Who works here, and on what
          </h1>
        </div>
        {/* The only route to a client existing at all. Until this shipped the
            admin could assign clients but never create one, so the first-run
            CTA pointed at a page with nothing to do on it. */}
        <Button size="fig" asChild>
          <Link href="/admin/clients/new">{config.copy.addClient.cta}</Link>
        </Button>
      </header>

      <TeamAdmin
        me={me}
        buyers={buyers}
        clients={(clients.data ?? []) as AdminClient[]}
        assignments={byBuyer}
        pendingIds={pendingIds}
        newJoinIds={newJoinIds}
      />

      {/* Clears the nav marker: arriving here IS the acknowledgement. */}
      <MarkTeamSeen pending={newJoinIds.length > 0} />
    </div>
  );
}
