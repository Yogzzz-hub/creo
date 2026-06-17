import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function TicketDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-4 w-32" />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-18 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-8 w-64" />
      </div>

      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="flex flex-col" style={{ height: "min(500px, 70vh)" }}>
          <div className="flex-1 space-y-4 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] space-y-2 rounded-xl px-4 py-3 ${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"}`}>
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex items-end gap-2">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="size-9 shrink-0 rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
