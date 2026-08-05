"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { adminFetch } from "@/lib/admin-api"

interface CalendarEntry {
  id: string
  client_id: string
  content_plan_id: string | null
  scheduled_date: string
  deliverable_type: string
  content_topic: string | null
  status: string
  linked_task_id: string | null
  linked_deliverable_id: string | null
  created_at: string
  updated_at: string | null
}

const TYPE_COLORS: Record<string, string> = {
  poster: "border-l-rose-400 bg-rose-50 text-rose-800",
  reel: "border-l-blue-400 bg-blue-50 text-blue-800",
  carousel: "border-l-emerald-400 bg-emerald-50 text-emerald-800",
  story: "border-l-violet-400 bg-violet-50 text-violet-800",
  blog: "border-l-amber-400 bg-amber-50 text-amber-800",
  ad: "border-l-pink-400 bg-pink-50 text-pink-800",
  shoot_day: "border-l-teal-400 bg-teal-50 text-teal-800",
}

const CLIENT_COLORS = [
  "border-l-rose-400 bg-rose-50 text-rose-800",
  "border-l-blue-400 bg-blue-50 text-blue-800",
  "border-l-emerald-400 bg-emerald-50 text-emerald-800",
  "border-l-violet-400 bg-violet-50 text-violet-800",
  "border-l-amber-400 bg-amber-50 text-amber-800",
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function AdminCalendarPage() {
  const [clientFilter, setClientFilter] = useState("all")
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [events, setEvents] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendar = useCallback(() => {
    setLoading(true)
    setError(null)
    adminFetch<CalendarEntry[]>("/api/v1/calendar")
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const filteredEvents = events.filter((ev) => {
    const d = new Date(ev.scheduled_date)
    const matchesMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear
    const matchesClient = clientFilter === "all" || ev.client_id === clientFilter
    return matchesMonth && matchesClient
  })

  const uniqueClients = [...new Set(events.map((e) => e.client_id))]

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  const today = new Date()
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">
            Consolidated Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All client deliverables across the team
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={clientFilter}
            onValueChange={(v) => setClientFilter(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Client Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {uniqueClients.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="text-base font-semibold text-[#0D2137]">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px rounded-lg border bg-border">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="bg-[#F9FAFB] px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((day, idx) => {
              if (day === null) {
                return (
                  <div key={`empty-${idx}`} className="min-h-[100px] bg-white" />
                )
              }

              const dayEvents = filteredEvents.filter((ev) => {
                const d = new Date(ev.scheduled_date)
                return d.getDate() === day
              })
              const isToday = isCurrentMonth && day === today.getDate()

              return (
                <div
                  key={day}
                  className={`min-h-[100px] bg-white p-1.5 ${
                    isToday ? "ring-2 ring-inset ring-[#2B7BC4]" : ""
                  }`}
                >
                  <span
                    className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday
                        ? "bg-[#2B7BC4] text-white"
                        : "text-[#0D2137]"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.map((ev, evIdx) => {
                      const colorClass =
                        TYPE_COLORS[ev.deliverable_type] ||
                        CLIENT_COLORS[ev.client_id.charCodeAt(0) % CLIENT_COLORS.length] ||
                        "border-l-gray-400 bg-gray-50 text-gray-800"
                      return (
                        <div
                          key={evIdx}
                          className={`border-l-2 rounded-r px-1 py-0.5 text-[10px] leading-tight font-medium ${colorClass}`}
                          title={`${ev.client_id.slice(0, 8)} — ${ev.deliverable_type}`}
                        >
                          <span className="hidden xl:inline">{ev.client_id.slice(0, 4)} </span>
                          {ev.deliverable_type}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
