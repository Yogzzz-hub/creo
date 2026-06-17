import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PaymentsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-52" />
      </div>

      <Card className="rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="border-l-4 border-gray-200 bg-gray-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-baseline gap-1">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
        <CardContent className="p-5">
          <Skeleton className="mb-3 h-4 w-36" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-gray-100 px-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-3 w-24" />
                <div className="ml-auto">
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
