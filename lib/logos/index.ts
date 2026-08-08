import { config } from "@/lib/config";

/** The mark to draw for a client, in preference order.
 *
 *  1. What was stored for THIS client — uploaded, or resolved from Google Ads
 *     or their website.
 *  2. config.clientLogos, the hand-mapped demo assets. Kept because the seeded
 *     clients rely on them and removing it would empty the mockups.
 *  3. Nothing, and ClientAvatar falls back to initials.
 *
 *  One function rather than `config.clientLogos[name]` scattered across four
 *  screens, because the moment a real logo exists the old map has to stop
 *  winning — and it would have kept winning on whichever screen was missed. */
export function logoFor(client: {
  name: string;
  logoUrl?: string;
}): string | undefined {
  return client.logoUrl || config.clientLogos[client.name];
}
