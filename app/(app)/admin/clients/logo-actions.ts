"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getRequestClient } from "@/lib/supabase";
import { resolveLogoFromWebsite } from "@/lib/logos/resolve";
import {
  recordLogoFailure,
  storeClientLogo,
  websiteFetchEnabled,
} from "@/lib/logos/store";

/* Changing a client's mark. Admin-only, like every write on this side — a buyer
   has no reason to decide what a client's logo looks like. */

export type LogoResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

const MAX_UPLOAD = 2 * 1024 * 1024;
/* What a logo can be. Not a general image allowlist — an SVG can carry script,
   so it is accepted only because these are stored on a separate origin from the
   app and served as attachments-by-default by Supabase Storage. */
const ALLOWED = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];

/** Look the client's website up again. The refresh button, and the same path
 *  creation takes. */
export async function refetchLogoAction(clientId: string): Promise<LogoResult> {
  await requireAdmin();
  z.string().uuid().parse(clientId);

  if (!websiteFetchEnabled()) {
    return {
      ok: false,
      error: "Automatic lookup is switched off (RELAY_LOGO_FETCH).",
    };
  }

  const sb = await getRequestClient();
  const { data } = await sb
    .from("clients")
    .select("domain")
    .eq("id", clientId)
    .maybeSingle();

  if (!data?.domain) {
    return { ok: false, error: "No website on file for this client." };
  }

  try {
    const found = await resolveLogoFromWebsite(data.domain);
    const { url } = await storeClientLogo({
      clientId,
      bytes: found.bytes,
      contentType: found.contentType,
      source: "website",
    });
    revalidateEverywhere(clientId);
    return { ok: true, url };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Lookup failed.";
    await recordLogoFailure(clientId, error);
    revalidateEverywhere(clientId);
    return { ok: false, error };
  }
}

/** The escape hatch that always wins. Whatever the automatic sources find, an
 *  admin who has the real asset can put it in and be done. */
export async function uploadLogoAction(input: {
  clientId: string;
  /** data: URL from the file picker. */
  dataUrl: string;
}): Promise<LogoResult> {
  await requireAdmin();
  z.string().uuid().parse(input.clientId);

  // [\s\S] rather than the `s` flag, which needs an es2018 target.
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(input.dataUrl);
  if (!match) return { ok: false, error: "That file could not be read." };

  const contentType = match[1]!.toLowerCase();
  if (!ALLOWED.includes(contentType)) {
    return { ok: false, error: `${contentType} is not an image Relay stores.` };
  }

  const bytes = Buffer.from(match[2]!, "base64");
  if (bytes.byteLength > MAX_UPLOAD) {
    return { ok: false, error: "That image is over 2 MB." };
  }

  try {
    const { url } = await storeClientLogo({
      clientId: input.clientId,
      bytes: new Uint8Array(bytes),
      contentType,
      source: "upload",
    });
    revalidateEverywhere(input.clientId);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

/** Set or change the client's website.
 *
 *  It lives on the logo control because that is the only thing that uses it and
 *  because, until this existed, a domain could be set exactly once — at
 *  creation — and never corrected. A client that was added without one could
 *  never have a logo looked up at all, which made the automatic path
 *  unreachable for every client that predates it. */
export async function setDomainAction(input: {
  clientId: string;
  domain: string;
}): Promise<LogoResult> {
  await requireAdmin();
  z.string().uuid().parse(input.clientId);

  const host = input.domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");

  if (host !== "" && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) {
    return { ok: false, error: "That doesn't look like a domain." };
  }

  const sb = await getRequestClient();
  const { error } = await sb
    .from("clients")
    .update({ domain: host || null })
    .eq("id", input.clientId);
  if (error) return { ok: false, error: error.message };

  revalidateEverywhere(input.clientId);
  return { ok: true, url: null };
}

/** Back to initials. The stored object is left in the bucket deliberately —
 *  removing the pointer is instant and reversible, deleting bytes is neither. */
export async function clearLogoAction(clientId: string): Promise<LogoResult> {
  await requireAdmin();
  z.string().uuid().parse(clientId);

  const sb = await getRequestClient();
  const { error } = await sb
    .from("clients")
    .update({ logo_url: null, logo_source: null, logo_error: null })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidateEverywhere(clientId);
  return { ok: true, url: null };
}

/** The mark appears on Today, the overview and the client's own page. */
function revalidateEverywhere(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/today");
  revalidatePath("/overview");
  revalidatePath("/clients");
}
