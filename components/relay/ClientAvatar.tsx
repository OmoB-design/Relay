import Image from "next/image";
import { cn } from "@/lib/utils";

/* The client mark on a digest row and a flag card (Figma node 3:15480).
   Two nested rounded boxes — an outer tile and an inner well — with a 21px
   glyph, both carrying their own hairline and lift.

   THE ASSET IS STILL AN OPEN QUESTION. The mockups use Shopify's mark, but
   `sourceOfTruth` is only ever Google Ads or Triple Whale, and the chip beside
   this already states the source. So the glyph is standing in for one of two
   different things and the client hasn't said which:

     · a per-client brand avatar   → needs an `avatarUrl` field on the client
     · the data-source mark        → then the glyph is simply the wrong logo

   Until it's settled, `logo` renders the supplied asset and the initials
   fallback covers a client with none — which is also the shape the real
   component needs either way, since no agency has a logo for every client. */

const OUTER =
  "flex size-avatar shrink-0 items-center justify-center rounded-7 border-fig-thin border-border bg-panel p-0.5 shadow-avatar";
const WELL =
  "flex h-avatar-well min-w-0 flex-1 items-center justify-center rounded-5 border-fig-thin border-border bg-surface-primary shadow-avatar-well";

/** Two letters at most: "Northbrook" → N, "Acme Beverage Co" → AB. */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 1).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export function ClientAvatar({
  name,
  logo,
  className,
}: {
  name: string;
  /** Path under /public. Omit to render initials. */
  logo?: string;
  className?: string;
}) {
  return (
    <span className={cn(OUTER, className)}>
      <span className={WELL}>
        {logo ? (
          <Image
            src={logo}
            alt=""
            width={21}
            height={21}
            // Decorative: the client's name is already the adjacent text, so a
            // screen reader announcing the logo would just repeat it.
            aria-hidden="true"
            className="size-avatar-glyph"
          />
        ) : (
          <span
            aria-hidden="true"
            className="font-geist text-fig-caption-1 fig-medium text-heading-05"
          >
            {initialsFor(name)}
          </span>
        )}
      </span>
    </span>
  );
}
