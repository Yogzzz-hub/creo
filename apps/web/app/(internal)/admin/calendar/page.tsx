"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const CLIENTS = [
  { id: "all", name: "All Clients" },
  { id: "1", name: "Brew & Bloom Cafe" },
  { id: "2", name: "TechNova Solutions" },
  { id: "3", name: "FreshCart" },
  { id: "4", name: "StyleHaus" },
  { id: "5", name: "Urban Eats" },
]

const TEAM_MEMBERS = [
  { id: "all", name: "All Team Members" },
  { id: "1", name: "Priya Sharma" },
  { id: "2", name: "Rahul Mehta" },
  { id: "3", name: "Ananya Kumar" },
  { id: "4", name: "Vikram Desai" },
  { id: "5", name: "Neha Gupta" },
]

const CLIENT_COLORS: Record<string, string> = {
  "1": "border-l-rose-400 bg-rose-50 text-rose-800",
  "2": "border-l-blue-400 bg-blue-50 text-blue-800",
  "3": "border-l-emerald-400 bg-emerald-50 text-emerald-800",
  "4": "border-l-violet-400 bg-violet-50 text-violet-800",
  "5": "border-l-amber-400 bg-amber-50 text-amber-800",
}

const TYPE_COLORS: Record<string, string> = {
  Poster: "border-l-rose-400 bg-rose-50 text-rose-800",
  Reel: "border-l-blue-400 bg-blue-50 text-blue-800",
  Carousel: "border-l-emerald-400 bg-emerald-50 text-emerald-800",
  Story: "border-l-violet-400 bg-violet-50 text-violet-800",
  Blog: "border-l-amber-400 bg-amber-50 text-amber-800",
  Ad: "border-l-pink-400 bg-pink-50 text-pink-800",
}

interface CalendarEvent {
  day: number
  clientId: string
  clientName: string
  type: string
  assignee: string
}

const MOCK_EVENTS: CalendarEvent[] = [
  { day: 2, clientId: "1", clientName: "B&B", type: "Poster", assignee: "Priya S." },
  { day: 2, clientId: "2", clientName: "TN", type: "Blog", assignee: "Ananya K." },
  { day: 3, clientId: "3", clientName: "FC", type: "Reel", assignee: "Rahul M." },
  { day: 4, clientId: "1", clientName: "B&B", type: "Story", assignee: "Neha G." },
  { day: 5, clientId: "4", clientName: "SH", type: "Carousel", assignee: "Priya S." },
  { day: 5, clientId: "5", clientName: "UE", type: "Poster", assignee: "Vikram D." },
  { day: 6, clientId: "2", clientName: "TN", type: "Ad", assignee: "Ananya K." },
  { day: 7, clientId: "3", clientName: "FC", type: "Poster", assignee: "Priya S." },
  { day: 9, clientId: "1", clientName: "B&B", type: "Reel", assignee: "Rahul M." },
  { day: 9, clientId: "5", clientName: "UE", type: "Carousel", assignee: "Neha G." },
  { day: 10, clientId: "4", clientName: "SH", type: "Story", assignee: "Neha G." },
  { day: 10, clientId: "2", clientName: "TN", type: "Poster", assignee: "Priya S." },
  { day: 11, clientId: "3", clientName: "FC", type: "Blog", assignee: "Ananya K." },
  { day: 12, clientId: "1", clientName: "B&B", type: "Poster", assignee: "Priya S." },
  { day: 12, clientId: "5", clientName: "UE", type: "Reel", assignee: "Rahul M." },
  { day: 13, clientId: "4", clientName: "SH", type: "Ad", assignee: "Ananya K." },
  { day: 14, clientId: "2", clientName: "TN", type: "Reel", assignee: "Rahul M." },
  { day: 16, clientId: "1", clientName: "B&B", type: "Carousel", assignee: "Priya S." },
  { day: 16, clientId: "3", clientName: "FC", type: "Poster", assignee: "Neha G." },
  { day: 17, clientId: "5", clientName: "UE", type: "Story", assignee: "Neha G." },
  { day: 18, clientId: "4", clientName: "SH", type: "Reel", assignee: "Rahul M." },
  { day: 19, clientId: "2", clientName: "TN", type: "Carousel", assignee: "Ananya K." },
  { day: 19, clientId: "1", clientName: "B&B", type: "Ad", assignee: "Priya S." },
  { day: 20, clientId: "3", clientName: "FC", type: "Reel", assignee: "Rahul M." },
  { day: 23, clientId: "1", clientName: "B&B", type: "Poster", assignee: "Priya S." },
  { day: 23, clientId: "5", clientName: "UE", type: "Blog", assignee: "Ananya K." },
  { day: 24, clientId: "4", clientName: "SH", type: "Poster", assignee: "Neha G." },
  { day: 25, clientId: "2", clientName: "TN", type: "Ad", assignee: "Ananya K." },
  { day: 25, clientId: "3", clientName: "FC", type: "Story", assignee: "Neha G." },
  { day: 26, clientId: "1", clientName: "B&B", type: "Reel", assignee: "Rahul M." },
  { day: 27, clientId: "5", clientName: "UE", type: "Poster", assignee: "Priya S." },
  { day: 28, clientId: "4", clientName: "SH", type: "Carousel", assignee: "Ananya K." },
  { day: 28, clientId: "2", clientName: "TN", type: "Blog", assignee: "Ananya K." },
  { day: 29, clientId: "3", clientName: "FC", type: "Reel", assignee: "Rahul M." },
  { day: 30, clientId: "1", clientName: "B&B", type: "Story", assignee: "Neha G." },
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
  const [teamFilter, setTeamFilter] = useState("all")
  const [currentMonth, setCurrentMonth] = useState(5)
  const [currentYear, setCurrentYear] = useState(2026)

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const filteredEvents = MOCK_EVENTS.filter((ev) => {
    const matchesClient =
      clientFilter === "all" || ev.clientId === clientFilter
    const matchesTeam =
      teamFilter === "all" || ev.assignee === TEAM_MEMBERS.find((t) => t.id === teamFilter)?.name
    return matchesClient && matchesTeam
  })

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

  const today = 17
  const isJune = currentMonth === 5 && currentYear === 2026

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
              {CLIENTS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={teamFilter}
            onValueChange={(v) => setTeamFilter(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Team Member" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_MEMBERS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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

            const dayEvents = filteredEvents.filter((ev) => ev.day === day)
            const isToday = isJune && day === today

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
                    const colorClass = TYPE_COLORS[ev.type] || CLIENT_COLORS[ev.clientId] || "border-l-gray-400 bg-gray-50 text-gray-800"
                    return (
                      <div
                        key={evIdx}
                        className={`border-l-2 rounded-r px-1 py-0.5 text-[10px] leading-tight font-medium ${colorClass}`}
                        title={`${ev.clientName} — ${ev.type} (${ev.assignee})`}
                      >
                        <span className="hidden xl:inline">{ev.clientName} </span>
                        {ev.type}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
