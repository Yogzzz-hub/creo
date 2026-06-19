import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-xl shadow-[var(--shadow-card)]">
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="p-0">
            <div className="flex items-start gap-4 border-l-4 border-gray-200 bg-gray-50 p-5">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="relative flex items-center justify-between">
              <Skeleton className="absolute left-0 top-3 h-0.5 w-full" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center">
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="mt-2 h-2.5 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
                <Skeleton className="size-5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 rounded-lg border p-4">
                  <Skeleton className="size-6" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
