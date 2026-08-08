import { getSupabase } from "@/lib/supabase";
import { nowIso } from "@/lib/clock";
import { resolveLogoFromWebsite } from "@/lib/logos/resolve";

/* Putting a resolved logo somewhere the app can serve it. SERVER ONLY. */

export const LOGO_BUCKET = "client-logos";

export type LogoSource = "upload" | "google-ads" | "website";

/** Outbound fetching of a client's own site. The agency-wide off switch.
 *
 *  Default ON: it is the only automatic source until the Google Ads connector
 *  lands, and a feature that is off by default is a feature nobody discovers.
 *  Set RELAY_LOGO_FETCH=off to stop Relay ever reaching out to a client's
 *  server — the upload path keeps working. */
export function websiteFetchEnabled(): boolean {
  const flag = (process.env.RELAY_LOGO_FETCH ?? "").trim().toLowerCase();
  return flag !== "off" && flag !== "0" && flag !== "false";
}

const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/gif": "gif",
};

/** Store bytes and point the client at them.
 *
 *  The object name carries a timestamp so a refreshed logo lands at a NEW url.
 *  Overwriting in place would leave every already-rendered page — and every CDN
 *  between here and the reader — showing the old mark with no way to tell. */
export async function storeClientLogo(input: {
  clientId: string;
  bytes: Uint8Array;
  contentType: string;
  source: LogoSource;
}): Promise<{ url: string }> {
  const extension = EXTENSION[input.contentType] ?? "png";
  const path = `${input.clientId}/${Date.now()}.${extension}`;
  const sb = await getSupabase();

  const { error } = await sb.storage
    .from(LOGO_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.contentType,
      // A brand mark changes rarely, and the path changes when it does.
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw new Error(`Couldn't store the logo: ${error.message}`);

  const {
    data: { publicUrl },
  } = sb.storage.from(LOGO_BUCKET).getPublicUrl(path);

  const { error: updateError } = await sb
    .from("clients")
    .update({
      logo_url: publicUrl,
      logo_source: input.source,
      logo_fetched_at: nowIso(),
      logo_error: null,
    })
    .eq("id", input.clientId);
  if (updateError) throw new Error(updateError.message);

  return { url: publicUrl };
}

/** Record that an automatic lookup failed, so the UI can say why.
 *  Deliberately NOT an exception at the call site: a client that could not be
 *  given a logo is still a client, and failing creation over a picture would be
 *  absurd. */
export async function recordLogoFailure(
  clientId: string,
  reason: string,
): Promise<void> {
  const sb = await getSupabase();
  await sb
    .from("clients")
    .update({ logo_error: reason.slice(0, 300), logo_fetched_at: nowIso() })
    .eq("id", clientId);
}

/** The automatic path: look the domain up, store whatever comes back.
 *  Never throws — it returns what happened. */
export async function autoResolveLogo(input: {
  clientId: string;
  domain?: string | null;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!input.domain) return { ok: false, error: "No website on file." };
  if (!websiteFetchEnabled()) {
    return { ok: false, error: "Automatic logo lookup is switched off." };
  }
  try {
    const found = await resolveLogoFromWebsite(input.domain);
    const { url } = await storeClientLogo({
      clientId: input.clientId,
      bytes: found.bytes,
      contentType: found.contentType,
      source: "website",
    });
    return { ok: true, url };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Logo lookup failed.";
    await recordLogoFailure(input.clientId, error);
    return { ok: false, error };
  }
}
