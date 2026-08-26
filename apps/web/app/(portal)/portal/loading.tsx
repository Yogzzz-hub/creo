import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PortalDashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Stats Cards Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity Skeleton */}
        <Card className="col-span-4 rounded-xl shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36 mb-1" />
            <Skeleton className="h-3.5 w-52" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Brand Summary / Details Skeleton */}
        <Card className="col-span-3 rounded-xl shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-3.5 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
