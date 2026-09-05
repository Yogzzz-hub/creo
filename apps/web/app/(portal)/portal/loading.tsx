import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PortalDashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
      </div>

      {/* Stats Cards Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-xl border border-border bg-white shadow-[var(--shadow-card)] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="size-5 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2 rounded-md" />
              <Skeleton className="h-3 w-36 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity Skeleton */}
        <Card className="col-span-4 rounded-xl border border-border bg-white shadow-[var(--shadow-card)]">
          <CardHeader className="pb-3 border-b border-gray-100">
            <Skeleton className="h-5 w-40 mb-1 rounded" />
            <Skeleton className="h-3.5 w-60 rounded" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-44 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Brand Summary / Details Skeleton */}
        <Card className="col-span-3 rounded-xl border border-border bg-white shadow-[var(--shadow-card)]">
          <CardHeader className="pb-3 border-b border-gray-100">
            <Skeleton className="h-5 w-44 mb-1 rounded" />
            <Skeleton className="h-3.5 w-56 rounded" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-11/12 rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg mt-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
