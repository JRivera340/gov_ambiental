import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 gap-1.5",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-white hover:bg-primary-dark",
        secondary:
          "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
        destructive:
          "border-transparent bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
        outline: "text-neutral-700 border-neutral-200",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
        warning:
          "border-transparent bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        // Estados de actividad
        borrador:
          "border-transparent bg-amber-50 text-amber-700 border-amber-200",
        enviada:
          "border-transparent bg-red-50 text-red-700 border-red-200",
        aprobada:
          "border-transparent bg-emerald-50 text-emerald-700 border-emerald-200",
        rechazada:
          "border-transparent bg-red-50 text-red-700 border-red-200",
        publicada:
          "border-transparent bg-green-50 text-green-700 border-green-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
