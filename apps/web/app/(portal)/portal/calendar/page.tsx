"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "@/context/session-context"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
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

  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null)
  const [editTopic, setEditTopic] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editType, setEditType] = useState<DeliverableType>("poster")
  const [editStatus, setEditStatus] = useState<string>("scheduled")
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

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

  const startEditing = (entry: CalendarEntry) => {
    setEditingEntry(entry)
    setEditTopic(entry.topic)
    setEditDate(entry.date)
    setEditType(entry.type)
    setEditStatus(entry.status)
    setErrorMsg("")
  }

  async function handleSaveEdit() {
    if (!editingEntry || !token) return
    setSaving(true)
    setErrorMsg("")
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/calendar/${editingEntry.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scheduled_date: editDate,
            deliverable_type: editType,
            content_topic: editTopic,
            status: editStatus,
          }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setErrorMsg(body?.detail || "Failed to update item")
        setSaving(false)
        return
      }

      const updated = await res.json()
      
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingEntry.id
            ? {
                ...e,
                date: updated.scheduled_date,
                type: updated.deliverable_type,
                topic: updated.content_topic || "Untitled Content",
                status: updated.status,
              }
            : e
        )
      )
      setEditingEntry(null)
    } catch (err) {
      console.error(err)
      setErrorMsg("Network error. Please try again.")
    } finally {
      setSaving(false)
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

                    {/* Color-coded interactive tiles */}
                    <div className="flex flex-wrap gap-1">
                      {dayEntries.map((entry) => {
                        const config = TYPE_TILE_CONFIG[entry.type]
                        return (
                          <button
                            key={entry.id}
                            title={`${config.letter}: ${entry.topic}`}
                            onClick={() => startEditing(entry)}
                            className={cn(
                              "flex size-9 items-center justify-center rounded-md text-sm font-bold shadow-sm cursor-pointer hover:scale-105 transition-transform border-0 focus:outline-none",
                              config.bg,
                              config.text
                            )}
                          >
                            {config.letter}
                          </button>
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

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-[#0D2137] mb-4">Edit Schedule Item</h3>
            
            {errorMsg && (
              <div className="mb-4 rounded bg-red-50 p-2.5 text-xs font-medium text-red-600">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Topic
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-medium text-[#0D2137] focus:border-[#2B7BC4] focus:outline-none"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-medium text-[#0D2137] focus:border-[#2B7BC4] focus:outline-none"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Deliverable Type
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-medium text-[#0D2137] focus:border-[#2B7BC4] focus:outline-none bg-white"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as DeliverableType)}
                  >
                    <option value="poster">Poster</option>
                    <option value="reel">Reel</option>
                    <option value="story">Story</option>
                    <option value="shoot_day">Shoot Day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Status
                </label>
                <select
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-medium text-[#0D2137] focus:border-[#2B7BC4] focus:outline-none bg-white"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ready_for_review">Ready For Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingEntry(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-[#2B7BC4] hover:bg-[#205E98] text-white font-medium"
              >
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
