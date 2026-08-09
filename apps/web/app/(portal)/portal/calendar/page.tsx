"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "@/context/session-context"
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DeliverableType = "poster" | "reel" | "story" | "shoot_day"

interface CalendarEntry {
  id: string
  date: string
  type: DeliverableType
  topic: string
  status: string
}

const TYPE_TILE_CONFIG: Record<DeliverableType, { letter: string; bg: string; text: string }> = {
  poster: { letter: "P", bg: "bg-[#6BAED6]", text: "text-white" },
  reel:   { letter: "R", bg: "bg-[#9B59B6]", text: "text-white" },
  story:  { letter: "S", bg: "bg-[#F0A87E]", text: "text-white" },
  shoot_day: { letter: "SD", bg: "bg-[#0EA5E9]", text: "text-white" },
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
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

function getQuotaSummary(entries: CalendarEntry[]) {
  const counts = { poster: 0, reel: 0, story: 0, shoot_day: 0 } as Record<string, number>
  for (const e of entries) {
    if (e.type in counts) counts[e.type]++
  }
  return counts
}

export default function CalendarPage() {
  const { token } = useSession()
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  const [today] = useState(() => new Date())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [resetting, setResetting] = useState(false)

  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const fetchCalendar = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/calendar`,
      {
        headers: { Authorization: `Bearer ${token}` },
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
      status: e.status,
    }))
    setEntries(mapped)
    setLoading(false)
  }, [token])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  async function handleTestGenerate() {
    if (!token) return
    setGenerating(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/calendar/test-generate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        console.error("[Calendar] test-generate failed:", res.status, body)
        return
      }
      const data = await res.json()
      console.log("[Calendar] Generated", data.entries_created, "entries")
      await fetchCalendar()
    } catch (err) {
      console.error("[Calendar] test-generate network error:", err)
    } finally {
      setGenerating(false)
    }
  }

  async function handleTestReset() {
    if (!token) return
    setResetting(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/calendar/test-reset`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        console.error("[Calendar] test-reset failed:", res.status, body)
        return
      }
      const data = await res.json()
      console.log("[Calendar] Deleted", data.entries_deleted, "entries")
      await fetchCalendar()
    } catch (err) {
      console.error("[Calendar] test-reset network error:", err)
    } finally {
      setResetting(false)
    }
  }

  function navigateMonth(direction: number) {
    const totalMonths = currentYear * 12 + currentMonth + direction
    const newYear = Math.floor(totalMonths / 12)
    const newMonth = ((totalMonths % 12) + 12) % 12
    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
  }

  const filteredEntries = entries.filter((e) => {
    const d = new Date(e.date + "T00:00:00")
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth
  })

  const quota = getQuotaSummary(filteredEntries)

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">Content Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your scheduled content for the month.
          </p>
        </div>

        {/* Quota summary — top right */}
        {!loading && filteredEntries.length > 0 && (
          <div className="flex items-center gap-4 text-sm font-semibold">
            {quota.poster > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-5 items-center justify-center rounded bg-[#6BAED6] text-[10px] font-bold text-white">P</span>
                <span className="text-[#6BAED6]">{quota.poster} POSTERS</span>
              </span>
            )}
            {quota.story > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-5 items-center justify-center rounded bg-[#F0A87E] text-[10px] font-bold text-white">S</span>
                <span className="text-[#F0A87E]">{quota.story} STORIES</span>
              </span>
            )}
            {quota.reel > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-5 items-center justify-center rounded bg-[#9B59B6] text-[10px] font-bold text-white">R</span>
                <span className="text-[#9B59B6]">{quota.reel} REELS</span>
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTestReset}
              disabled={resetting}
              className="ml-2 text-gray-400 hover:text-red-500"
            >
              {resetting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
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
      ) : filteredEntries.length === 0 ? (
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#E8F4FD]">
              <span className="text-3xl">📅</span>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-[#0D2137]">
              Your content calendar is being set up
            </h3>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
              Check back after your content plan is approved.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={handleTestGenerate}
                disabled={generating || resetting}
              >
                {generating && <Loader2 className="mr-2 size-4 animate-spin" />}
                {generating ? "Generating…" : "Dev: Generate Test Calendar"}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestReset}
                disabled={generating || resetting}
              >
                {resetting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {resetting ? "Deleting…" : "Dev: Reset Calendar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="p-4 sm:p-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="text-base font-semibold text-[#0D2137]">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px rounded-lg border border-gray-200 bg-gray-200">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}

              {/* Day cells */}
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="bg-white min-h-[72px] sm:min-h-[88px]"
                    />
                  )
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
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
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

                    {/* Color-coded tiles */}
                    <div className="flex flex-wrap gap-1">
                      {dayEntries.map((entry) => {
                        const config = TYPE_TILE_CONFIG[entry.type]
                        return (
                          <div
                            key={entry.id}
                            title={`${config.letter}: ${entry.topic}`}
                            className={cn(
                              "flex size-9 items-center justify-center rounded-md text-sm font-bold shadow-sm",
                              config.bg,
                              config.text
                            )}
                          >
                            {config.letter}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer legend */}
            <div className="mt-4 flex items-center justify-center gap-6 text-sm font-medium text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-5 items-center justify-center rounded bg-[#6BAED6] text-[10px] font-bold text-white">P</span>
                POSTER
              </span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-5 items-center justify-center rounded bg-[#9B59B6] text-[10px] font-bold text-white">R</span>
                REEL
              </span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-5 items-center justify-center rounded bg-[#F0A87E] text-[10px] font-bold text-white">S</span>
                STORY
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
