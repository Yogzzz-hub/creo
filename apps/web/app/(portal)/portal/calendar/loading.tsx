import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function CalendarLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-8 w-44 rounded-lg" />
      </div>

      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="size-8 rounded-lg" />
          </div>

          <div className="grid grid-cols-7 gap-px rounded-lg border border-gray-200 bg-gray-200">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={`header-${i}`} className="bg-gray-50 py-2 text-center">
                <Skeleton className="mx-auto h-3 w-6" />
              </div>
            ))}

            {Array.from({ length: 35 }).map((_, i) => (
              <div key={`cell-${i}`} className="bg-white p-1.5 min-h-[72px] sm:min-h-[88px]">
                <Skeleton className="mb-1.5 h-3 w-4" />
                <div className="space-y-1">
                  {Math.random() > 0.6 && (
                    <>
                      <Skeleton className="h-2.5 w-full rounded" />
                      <Skeleton className="h-2.5 w-3/4 rounded" />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
