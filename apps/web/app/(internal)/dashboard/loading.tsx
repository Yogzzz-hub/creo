import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Title Header Skeleton */}
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-1 h-4 w-60" />
      </div>

      {/* Goal Metrics Card Skeleton */}
      <Card className="rounded-xl border border-gray-200 shadow-sm bg-white">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Small Stat Cards Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="rounded-xl border border-gray-200 shadow-sm bg-white">
          <CardContent className="flex items-center gap-4 py-5">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200 shadow-sm bg-white">
          <CardContent className="flex items-center gap-4 py-5">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Card Skeleton */}
      <Card className="rounded-xl border border-gray-200 shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-gray-100 p-3.5"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3.5 w-36" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="size-4 rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
