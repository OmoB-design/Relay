import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRequestClient } from "@/lib/supabase";
import { config } from "@/lib/config";
import { ProfileSchema, type Profile } from "@/lib/types";
import { AddClientForm } from "@/components/relay/AddClientForm";

/* Add a client. Its own route rather than a modal over /admin: the tracker-tab
   check needs room to say what it found, and the result is a page an admin can
   be sent a link to.

   requireAdmin() redirects a buyer to /today, and RLS refuses the insert in any
   case — the redirect is for clarity, not for safety. */

export const dynamic = "force-dynamic";

const t = config.copy.addClient;

export default async function NewClientPage() {
  await requireAdmin();
  const sb = await getRequestClient();

  /* Revoked buyers are left out: assigning a client to someone whose access has
     been withdrawn creates coverage that does not exist. */
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("status", "active")
    .order("name");

  const buyers: Profile[] = (data ?? []).flatMap((r) => {
    const parsed = ProfileSchema.safeParse({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      status: r.status,
    });
    // The admin only oversees — they carry no clients, so they are not offered.
    return parsed.success && parsed.data.role === "buyer" ? [parsed.data] : [];
  });

  return (
    <div className="mx-auto max-w-column px-4 md:px-6 py-10">
      <header className="mb-8">
        <Link
          href="/admin"
          className="font-geist text-fig-caption-1 text-heading-06 underline-offset-4 hover:underline"
        >
          {config.copy.admin.title}
        </Link>
        <h1 className="mt-1 font-geist text-28 fig-sb text-heading-01">
          {t.title}
        </h1>
        <p className="mt-2 max-w-column font-geist text-fig-caption-1 text-heading-06">
          {t.lede}
        </p>
      </header>

      <AddClientForm buyers={buyers} />
    </div>
  );
}
