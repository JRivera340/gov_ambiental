import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const inputVariants = cva(
  "flex h-11 w-full rounded-lg border bg-white px-4 py-3 text-sm text-neutral-700 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-neutral-700 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
  {
    variants: {
      variant: {
        default: "border-neutral-200 hover:border-neutral-300 focus-visible:ring-primary/20 focus-visible:border-primary",
        error: "border-red-300 hover:border-red-400 focus-visible:ring-red-200 focus-visible:border-red-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
