import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md skeleton-shimmer bg-slate-200/80 dark:bg-slate-700/80", className)}
      {...props}
    />
  )
}

export { Skeleton }
