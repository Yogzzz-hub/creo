"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "@/context/session-context"
import { ChevronLeft, ChevronRight, Loader2, Pencil, Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getApiUrl } from "@/lib/api-url"

type DeliverableType = "poster" | "reel" | "story" | "shoot_day"

interface CalendarEntry {
  id: string
  date: string
  type: DeliverableType
  topic: string
  status: string
}

interface TypeConfig {
  label: string
  letter: string
  bg: string
  hoverBg: string
  text: string
  badgeBg: string
  border: string
}

const TYPE_CONFIG: Record<DeliverableType, TypeConfig> = {
  poster: {
    label: "Poster",
    letter: "P",
    bg: "bg-[#6BAED6]",
    hoverBg: "hover:bg-[#529ec9]",
    text: "text-white",
    badgeBg: "bg-black/20",
    border: "border-[#529ec9]",
  },
  reel: {
    label: "Reel",
    letter: "R",
    bg: "bg-[#9B59B6]",
    hoverBg: "hover:bg-[#8e44ad]",
    text: "text-white",
    badgeBg: "bg-black/20",
    border: "border-[#8e44ad]",
  },
  story: {
    label: "Story",
    letter: "S",
    bg: "bg-[#F0A87E]",
    hoverBg: "hover:bg-[#e59567]",
    text: "text-white",
    badgeBg: "bg-black/20",
    border: "border-[#e59567]",
  },
  shoot_day: {
    label: "Shoot Day",
    letter: "SD",
    bg: "bg-[#0EA5E9]",
    hoverBg: "hover:bg-[#0284c7]",
    text: "text-white",
    badgeBg: "bg-black/20",
    border: "border-[#0284c7]",
  },
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

  // Edit / Date Change Modal State (Date & Type only)
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null)
  const [editDate, setEditDate] = useState("")
  const [editType, setEditType] = useState<DeliverableType>("poster")
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

    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/api/v1/calendar`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        setEntries([])
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

      const mapped: CalendarEntry[] = (Array.isArray(data) ? data : []).map((e) => ({
        id: e.id,
        date: e.scheduled_date,
        type: (e.deliverable_type as DeliverableType) || "poster",
        topic: e.content_topic || "Untitled Content",
        status: e.status,
      }))
      setEntries(mapped)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  const startEditing = (entry: CalendarEntry) => {
    setEditingEntry(entry)
    setEditDate(entry.date)
    setEditType(entry.type)
    setErrorMsg("")
  }

  async function handleSaveEdit() {
    if (!editingEntry || !token) return
    setSaving(true)
    setErrorMsg("")
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/api/v1/calendar/${editingEntry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scheduled_date: editDate,
          deliverable_type: editType,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setErrorMsg(body?.detail || "Failed to update schedule item")
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
                topic: updated.content_topic || e.topic,
                status: updated.status || e.status,
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
          <p className="text-sm text-gray-500">
            Your scheduled content for the month. Click any item to change date or deliverable type.
          </p>
        </div>

        {/* Quota summary — top right */}
        {!loading && filteredEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold">
            {quota.poster > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#6BAED6]/10 px-2.5 py-1 text-[#6BAED6]">
                <span className="inline-flex size-4 items-center justify-center rounded bg-[#6BAED6] text-[9px] font-bold text-white">
                  P
                </span>
                <span>{quota.poster} POSTERS</span>
              </span>
            )}
            {quota.reel > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#9B59B6]/10 px-2.5 py-1 text-[#9B59B6]">
                <span className="inline-flex size-4 items-center justify-center rounded bg-[#9B59B6] text-[9px] font-bold text-white">
                  R
                </span>
                <span>{quota.reel} REELS</span>
              </span>
            )}
            {quota.story > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#F0A87E]/10 px-2.5 py-1 text-[#d97c47]">
                <span className="inline-flex size-4 items-center justify-center rounded bg-[#F0A87E] text-[9px] font-bold text-white">
                  S
                </span>
                <span>{quota.story} STORIES</span>
              </span>
            )}
            {quota.shoot_day > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#0EA5E9]/10 px-2.5 py-1 text-[#0EA5E9]">
                <span className="inline-flex size-4 items-center justify-center rounded bg-[#0EA5E9] text-[9px] font-bold text-white">
                  SD
                </span>
                <span>{quota.shoot_day} SHOOT DAYS</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <Card className="rounded-xl border border-slate-200/80 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-8 w-36" />
              <div className="flex gap-2">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border border-border/80 shadow-[var(--shadow-card)]">
          <CardContent className="p-3 sm:p-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth(-1)}
                className="hover:bg-[#E8F4FD] hover:text-[#2B7BC4]"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <h2 className="text-lg font-bold text-[#0D2137]">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth(1)}
                className="hover:bg-[#E8F4FD] hover:text-[#2B7BC4]"
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px rounded-lg border border-gray-200 bg-gray-200 overflow-hidden">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="bg-gray-50 py-2.5 text-center text-xs font-semibold text-gray-600"
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
                      className="bg-gray-50/50 min-h-[85px] sm:min-h-[105px]"
                    />
                  )
                }

                const dayEntries = getEntriesForDay(entries, currentYear, currentMonth, day)
                const isToday = isCurrentMonth && today.getDate() === day

                return (
                  <div
                    key={day}
                    className={cn(
                      "bg-white p-1.5 sm:p-2 min-h-[85px] sm:min-h-[105px] flex flex-col transition-colors",
                      isToday && "bg-[#E8F4FD]/50 ring-1 ring-inset ring-[#2B7BC4]/30"
                    )}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isToday
                            ? "flex size-5 items-center justify-center rounded-full bg-[#2B7BC4] text-white shadow-xs"
                            : "text-gray-700"
                        )}
                      >
                        {day}
                      </span>
                      {dayEntries.length > 0 && (
                        <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                          {dayEntries.length} {dayEntries.length === 1 ? "item" : "items"}
                        </span>
                      )}
                    </div>

                    {/* Color-coded interactive scheduled items */}
                    <div className="flex flex-col gap-1.5 flex-1">
                      {dayEntries.map((entry) => {
                        const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.poster
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            title={`Click to edit date or type: ${config.label} — ${entry.topic}`}
                            onClick={() => startEditing(entry)}
                            className={cn(
                              "group relative flex w-full items-center justify-between gap-1 rounded-md px-1.5 py-1 text-left text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer border border-transparent",
                              "hover:scale-[1.02] hover:shadow-md hover:ring-2 hover:ring-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B7BC4]",
                              config.bg,
                              config.hoverBg,
                              config.text
                            )}
                          >
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <span
                                className={cn(
                                  "inline-flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white",
                                  config.badgeBg
                                )}
                              >
                                {config.letter}
                              </span>
                              <span className="truncate text-[10px] sm:text-[11px] font-medium leading-tight opacity-95">
                                {entry.topic}
                              </span>
                            </div>

                            {/* Interactive Edit / Pencil Icon (inline & highlighted on hover) */}
                            <span
                              className="inline-flex size-4 shrink-0 items-center justify-center rounded bg-black/15 opacity-80 group-hover:opacity-100 group-hover:bg-black/30 group-hover:scale-110 transition-all"
                              title="Edit date & deliverable type"
                            >
                              <Pencil className="size-2.5 text-white stroke-[2.5]" />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer legend */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-4 sm:size-5 items-center justify-center rounded bg-[#6BAED6] text-[10px] font-bold text-white">
                  P
                </span>
                POSTER
              </span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-4 sm:size-5 items-center justify-center rounded bg-[#9B59B6] text-[10px] font-bold text-white">
                  R
                </span>
                REEL
              </span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-4 sm:size-5 items-center justify-center rounded bg-[#F0A87E] text-[10px] font-bold text-white">
                  S
                </span>
                STORY
              </span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-4 sm:size-5 items-center justify-center rounded bg-[#0EA5E9] text-[10px] font-bold text-white">
                  SD
                </span>
                SHOOT DAY
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit / Date & Type Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <Card className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md text-xs font-bold text-white",
                    TYPE_CONFIG[editType]?.bg || "bg-[#2B7BC4]"
                  )}
                >
                  {TYPE_CONFIG[editType]?.letter || "E"}
                </div>
                <h3 className="text-lg font-bold text-[#0D2137]">Edit Scheduled Content</h3>
              </div>
              <span className="rounded-full bg-[#E8F4FD] px-2.5 py-0.5 text-xs font-semibold text-[#2B7BC4] uppercase">
                {TYPE_CONFIG[editType]?.label || editType}
              </span>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0D2137] focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4] focus:outline-none"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Deliverable Type
                </label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0D2137] focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4] focus:outline-none bg-white"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as DeliverableType)}
                >
                  <option value="poster">Poster (P)</option>
                  <option value="reel">Reel (R)</option>
                  <option value="story">Story (S)</option>
                  <option value="shoot_day">Shoot Day (SD)</option>
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
                disabled={saving || !editDate}
                className="bg-[#2B7BC4] hover:bg-[#205E98] text-white font-medium shadow-xs"
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
