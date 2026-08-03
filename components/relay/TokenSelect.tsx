import { cn } from "@/lib/utils";

/* A native <select> styled with theme tokens. Used for the small enum choices
   on the Profile tab (polarity, sensitivity type, cadence, channel, gets) —
   shadcn's Select isn't in the approved component set, and a native control is
   the simplest accessible thing that works at 375px. */

export function TokenSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-line bg-surface px-2 font-ui text-14 text-ink",
        className,
      )}
      {...props}
    />
  );
}
