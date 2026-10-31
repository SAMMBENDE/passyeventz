import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-gold text-foreground shadow-[0_18px_45px_rgba(214,163,77,0.25)] hover:bg-light-gold",
        secondary:
          "border border-[rgba(214,163,77,0.38)] bg-[rgba(255,249,239,0.04)] text-background hover:border-gold hover:bg-[rgba(214,163,77,0.08)]",
        outline:
          "border border-[rgba(8,7,6,0.15)] bg-transparent text-foreground hover:border-gold hover:bg-[rgba(214,163,77,0.06)]",
        ghost: "bg-transparent text-foreground hover:bg-[rgba(8,7,6,0.04)]",
      },
      size: {
        default: "h-12 px-5 py-3",
        sm: "h-10 px-4 text-xs",
        lg: "h-14 px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
