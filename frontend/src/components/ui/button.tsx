import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] px-4 py-2.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-sm hover:bg-primary-dark active:bg-primary-dark",
        destructive:
          "bg-status-rechazada text-white shadow-sm hover:bg-red-700 active:bg-red-800",
        outline:
          "border border-neutral-200 bg-white hover:bg-neutral-50 hover:text-neutral-900",
        secondary:
          "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
        ghost: "hover:bg-neutral-100 hover:text-neutral-900",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-white shadow-sm hover:bg-success-dark active:bg-success-dark",
      },
      size: {
        default: "h-11 px-4 py-2.5",
        sm: "h-9 rounded-md px-3 text-xs min-h-[36px]",
        lg: "h-12 rounded-lg px-8 text-base min-h-[52px]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
