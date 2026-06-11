import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muse/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-paper hover:bg-ink/90 shadow-soft",
        brass:
          "bg-brass text-white hover:bg-brass-deep shadow-soft",
        muse:
          "bg-muse text-white hover:bg-muse-deep shadow-soft",
        outline:
          "border border-line bg-paper-raised text-ink hover:bg-paper-sunken",
        ghost: "text-ink-soft hover:bg-paper-sunken hover:text-ink",
        soft: "bg-paper-sunken text-ink hover:bg-line",
        museSoft:
          "bg-muse-soft text-muse-deep hover:bg-muse/15 border border-muse/15",
        danger: "bg-clay text-white hover:bg-clay/90 shadow-soft",
        link: "text-brass-deep underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[0.8125rem]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
