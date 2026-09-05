import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AddonsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-xl shadow-[var(--shadow-card)]">
              <CardContent className="flex flex-col p-5">
                <Skeleton className="size-12 rounded-xl" />
                <Skeleton className="mt-4 h-5 w-28" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-2/3" />
                <div className="mt-4 flex items-baseline gap-1">
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-8 rounded-lg" />
                    <Skeleton className="h-4 w-6" />
                    <Skeleton className="size-8 rounded-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-xl shadow-[var(--shadow-card)] lg:sticky lg:top-24 lg:self-start">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-5 w-28" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
            <Skeleton className="h-px w-full" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg mt-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
