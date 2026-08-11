import { cn } from "@/lib/utils";

/* A native <select> styled as the redesign's field — node 429:7062, the
   profile page's Selectors: white fill, hairline, radius 8, 12px value in
   Heading-03.

   Still a NATIVE control. shadcn's Select isn't in the approved set, and a
   native select is the simplest accessible thing that works at 375px — the
   frame's dropdown chevron is close enough to the platform's that replacing
   the control to own the arrow would be all cost.

   Used by four of the six profile cards (cadence, channel, polarity,
   sensitivity type, gets), which is exactly why it was the page's blocking
   dependency: while it wore the legacy field every card looked half-migrated
   no matter what the card itself did. */
export function TokenSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-auto rounded-8 border-fig border-border bg-surface-primary px-2 py-1.5 font-geist text-fig-caption-1 text-heading-03 shadow-field",
        className,
      )}
      {...props}
    />
  );
}
