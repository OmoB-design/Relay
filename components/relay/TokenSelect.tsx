import { cn } from "@/lib/utils";
import { SelectChevronGlyph } from "@/components/relay/NavIcons";

/* A native <select> styled as the redesign's field — node 429:7062, the
   profile page's Selectors: white fill, hairline, radius 8, 12px value in
   Heading-03, and EXACTLY 8px of padding left and right.

   appearance-none is what makes the 8px real. A native select carries OS
   chrome that indents the text unpredictably per platform, so the padding in
   the stylesheet is not the padding on screen until the chrome is stripped —
   and stripping it removes the OS arrow, so the frame's 10px chevron is drawn
   here instead, inset the same 8px. pr-6 keeps the value from running under
   it; the RIGHT PADDING the eye reads is the chevron's inset, exactly as the
   frame draws the field.

   Focus wears the Selectors component's Selected state (node 429:7122): 1px
   Blue/500 with the Blue/150 halo — the standard active treatment for every
   selector, replacing the browser outline.

   Still a NATIVE control underneath: the popup, keyboard behaviour and
   accessibility are the platform's, which is the simplest thing that works
   at 375px. */
export function TokenSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn("relative block w-full", className)}>
      <select
        className="h-auto w-full appearance-none rounded-8 border-fig border-border bg-surface-primary py-1.5 pl-2 pr-6 font-geist text-fig-caption-1 text-heading-03 shadow-field outline-none focus:border focus:border-blue-500 focus:shadow-field-active"
        {...props}
      />
      <SelectChevronGlyph className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-icon-explainer" />
    </span>
  );
}
