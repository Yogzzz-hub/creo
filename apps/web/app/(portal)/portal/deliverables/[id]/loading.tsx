import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function DeliverableDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-4 w-40" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>

      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <Skeleton className="aspect-[16/10] w-full rounded-t-xl" />
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="p-5">
          <Skeleton className="mb-4 h-4 w-20" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
