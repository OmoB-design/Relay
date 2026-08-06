import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/* Variants mirror the Figma Button component set (node 300:8781):
     Primary   black fill,      white text
     Secondary blue fill,       white text   — the pipeline-advancing action
     Outline   hairline border, dark text
     Ghost     no chrome,       dark text
     working   blue-400 fill,   grey-100 text — mid-submit
     disabled  grey fill,       grey-100 text — via the `disabled` attribute

   Figma gives `disabled` a solid grey fill rather than reduced opacity, so the
   shadcn default (`opacity-50`) is overridden for filled variants and kept for
   the chromeless ones, where a grey block would read as an enabled button. */
const buttonVariants = cva(
  /* Radius, font-size and font-weight are owned by `size`, never set here.
     tailwind-merge cannot collapse a custom token against a built-in — it left
     `rounded-md` sitting next to `rounded-8`, so which one applied came down to
     stylesheet order rather than class order. That silently made the compile
     button 8px instead of its designed 6px. Keeping the base free of those three
     properties removes the ambiguity entirely. */
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-fig border-border bg-primary text-primary-foreground shadow-control-sm hover:bg-primary/90 disabled:bg-heading-06 disabled:text-grey-100",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 disabled:opacity-50",
        outline:
          "border-fig border-border bg-transparent text-heading-01 shadow-control hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
        secondary:
          "border-fig border-border bg-secondary text-secondary-foreground shadow-control-sm hover:bg-blue-400 disabled:bg-heading-06 disabled:text-grey-100",
        ghost:
          "bg-transparent text-heading-01 hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
        working:
          "border-fig border-border bg-blue-400 text-grey-100 shadow-control-sm disabled:bg-blue-400 disabled:text-grey-100",
        link: "text-primary underline-offset-4 hover:underline disabled:opacity-50",
      },
      size: {
        /* Figma Button (node 300:8781): px 10 · radius 8 · 12px/1.2 Medium, and
           every variant measures 26px tall. That height is SET rather than left
           to py-1.5, which landed at 28.4px once the hairline was added on top
           of the padding — Figma keeps its 0.6px stroke inside the 26px box.
           The 2.4px matters: the radius is unchanged at 8px, but 8 on a 28.4px
           button reads squarer than 8 on a 26px one, which is why these looked
           under-rounded against the frame. */
        fig: "h-button-fig gap-1.5 rounded-8 px-2.5 text-fig-button fig-medium",
        /* Figma Compile (node 311:17920): px 8 · py 4 · radius 6 · gap 6 ·
           13px/1.2 SemiBold · 12px icon. A different size, not a variant of fig. */
        "fig-compile":
          "gap-1.5 rounded-6 px-2 py-1 text-fig-body fig-sb [&_svg:not([class*='size-'])]:size-3",
        /* Legacy shadcn sizes, still used by the screens awaiting redesign.
           Each now carries its own radius and text size. */
        default: "h-9 rounded-md px-4 py-2 text-sm font-medium has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs font-medium has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 text-sm font-medium has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 text-sm font-medium has-[>svg]:px-4",
        icon: "size-9 rounded-md text-sm font-medium",
        "icon-xs":
          "size-6 rounded-md text-sm font-medium [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-md text-sm font-medium",
        "icon-lg": "size-10 rounded-md text-sm font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
