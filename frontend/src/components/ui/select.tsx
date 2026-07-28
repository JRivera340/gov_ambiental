import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const selectVariants = cva(
  "flex h-11 w-full rounded-lg border bg-white px-4 py-3 text-sm text-neutral-700 ring-offset-white focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all appearance-none bg-no-repeat bg-right pr-10 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.25em_1.25em] bg-[position:right_0.75rem_center]",
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

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof selectVariants> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, variant, ...props }, ref) => {
    return (
      <select
        className={cn(selectVariants({ variant }), className)}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select, selectVariants }
