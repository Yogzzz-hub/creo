"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CalendarStatus = "scheduled" | "ready_for_review" | "approved"
type DeliverableType = "poster" | "reel" | "story"
type ViewMode = "month" | "list"

interface CalendarEntry {
  id: string
  date: string
  type: DeliverableType
  topic: string
  status: CalendarStatus
}

const STATUS_CONFIG: Record<CalendarStatus, { label: string; className: string; dotColor: string }> = {
  scheduled: {
    label: "Scheduled",
    className: "bg-sky-100 text-sky-700 border-sky-200",
    dotColor: "bg-sky-400",
  },
  ready_for_review: {
    label: "Ready for Review",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-400",
  },
}

const TYPE_ICONS: Record<DeliverableType, string> = {
  poster: "🖼️",
  reel: "🎬",
  story: "📱",
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function mapStatus(apiStatus: string): CalendarStatus {
  switch (apiStatus) {
    case "approved":
      return "approved"
    case "ready_for_review":
    case "in_progress":
      return "ready_for_review"
    default:
      return "scheduled"
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function getEntriesForDay(entries: CalendarEntry[], year: number, month: number, day: number): CalendarEntry[] {
  return entries.filter((entry) => {
    const entryDate = new Date(entry.date + "T00:00:00")
    return (
      entryDate.getFullYear() === year &&
      entryDate.getMonth() === month &&
      entryDate.getDate() === day
    )
  })
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  const [today] = useState(() => new Date())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)

  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  useEffect(() => {
    async function fetchCalendar() {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setLoading(false)
        return
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/calendar`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )

      if (!res.ok) {
        setLoading(false)
        return
      }

      const data: {
        id: string
        scheduled_date: string
        deliverable_type: string
        content_topic: string | null
        status: string
      }[] = await res.json()

      const mapped: CalendarEntry[] = data.map((e) => ({
        id: e.id,
        date: e.scheduled_date,
        type: (e.deliverable_type as DeliverableType) || "poster",
        topic: e.content_topic || "Untitled Content",
        status: mapStatus(e.status),
      }))
      setEntries(mapped)
      setLoading(false)
    }

    fetchCalendar()
  }, [])

  function navigateMonth(direction: number) {
    const totalMonths = currentYear * 12 + currentMonth + direction
    const newYear = Math.floor(totalMonths / 12)
    const newMonth = ((totalMonths % 12) + 12) % 12
    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
  }

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">Content Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            View your scheduled and upcoming content.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setViewMode("month")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "month"
                ? "bg-[#2B7BC4] text-white"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Month View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "list"
                ? "bg-[#2B7BC4] text-white"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            List View
          </button>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "month" ? (
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="text-base font-semibold text-[#0D2137]">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-px rounded-lg border border-gray-200 bg-gray-200">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}

              {calendarCells.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="bg-white min-h-[72px] sm:min-h-[88px]" />
                }

                const dayEntries = getEntriesForDay(entries, currentYear, currentMonth, day)
                const isToday = isCurrentMonth && today.getDate() === day

                return (
                  <div
                    key={day}
                    className={cn(
                      "bg-white p-1.5 min-h-[72px] sm:min-h-[88px]",
                      isToday && "bg-[#E8F4FD]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isToday
                            ? "flex size-5 items-center justify-center rounded-full bg-[#2B7BC4] text-white"
                            : "text-gray-700"
                        )}
                      >
                        {day}
                      </span>
                    </div>

                    <div className="mt-1 space-y-0.5">
                      {dayEntries.slice(0, 3).map((entry) => {
                        const config = STATUS_CONFIG[entry.status]
                        return (
                          <div
                            key={entry.id}
                            className="group flex items-center gap-1 rounded px-1 py-0.5 text-[10px] hover:bg-gray-50"
                            title={entry.topic}
                          >
                            <span className={cn("size-1.5 shrink-0 rounded-full", config.dotColor)} />
                            <span className="truncate text-gray-600">
                              {TYPE_ICONS[entry.type]} {entry.topic}
                            </span>
                          </div>
                        )
                      })}
                      {dayEntries.length > 3 && (
                        <span className="block px-1 text-[10px] text-gray-400">
                          +{dayEntries.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", config.dotColor)} />
                  <span className="text-xs text-gray-500">{config.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedEntries.length === 0 ? (
            <Card className="rounded-xl shadow-[var(--shadow-card)]">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CalendarDays className="size-12 text-gray-300" />
                <h3 className="mt-4 text-base font-semibold text-[#0D2137]">
                  No scheduled content
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your content calendar is empty. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            sortedEntries.map((entry) => {
              const config = STATUS_CONFIG[entry.status]
              const entryDate = new Date(entry.date + "T00:00:00")
              const isPast = entryDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())

              return (
                <Card
                  key={entry.id}
                  className={cn(
                    "rounded-xl shadow-[var(--shadow-card)] transition-all hover:shadow-md",
                    isPast && "opacity-70"
                  )}
                >
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                        <span className="text-lg">{TYPE_ICONS[entry.type]}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#0D2137]">
                          {entry.topic}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3" />
                            {formatDate(entry.date)}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="capitalize">{entry.type}</span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      className={cn(
                        "w-fit border text-[10px] font-medium sm:self-center",
                        config.className
                      )}
                    >
                      {config.label}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
