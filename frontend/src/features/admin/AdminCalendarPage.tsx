import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";

type CalendarEvent = { id: string; title: string; client_name: string; date: string; time: string; type: string; status: string };

export function AdminCalendarPage({ embedded = false }: { embedded?: boolean } = {}) {
  const Container = embedded ? "section" : "main";
  const Heading = embedded ? "h2" : "h1";
  const { user } = useAuth();
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [client, setClient] = useState("all");
  const year = month.getFullYear();
  const monthNumber = month.getMonth() + 1;
  const query = useQuery({
    queryKey: ["admin-calendar", user?.id, year, monthNumber],
    queryFn: () => request<CalendarEvent[]>(`/api/v1/admin/calendar?month=${monthNumber}&year=${year}`),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const events = query.data ?? [];
  const visible = events.filter((event) => client === "all" || event.client_name === client);
  const dayCount = new Date(year, monthNumber, 0).getDate();
  const offset = (month.getDay() + 6) % 7;
  const selected = visible.filter((event) => Number(event.date.split("-")[2]) === selectedDay);
  const moveMonth = (delta: number) => { setMonth(new Date(year, month.getMonth() + delta, 1)); setSelectedDay(1); };
  return <Container className={embedded ? "text-slate-100" : "min-h-screen bg-[#0B111C] text-slate-100 p-3 sm:p-6"}>
    <div className="max-w-7xl mx-auto space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><Heading className="text-2xl font-semibold">Content Calendar</Heading><p className="text-sm text-slate-400">Scheduled publications and deliverables</p></div>
        <button onClick={() => void query.refetch()} disabled={query.isFetching} className="min-h-11 px-4 rounded-xl border border-slate-700 inline-flex items-center gap-2"><RefreshCw size={16} />Refresh</button>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><button aria-label="Previous month" onClick={() => moveMonth(-1)} className="p-3 rounded-xl border border-slate-700"><ChevronLeft size={18} /></button><h2 className="text-base sm:text-xl font-semibold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><button aria-label="Next month" onClick={() => moveMonth(1)} className="p-3 rounded-xl border border-slate-700"><ChevronRight size={18} /></button></div>
        <label className="text-sm">Client <select value={client} onChange={(event) => setClient(event.target.value)} className="ml-2 min-h-11 max-w-48 bg-slate-900 border border-slate-700 rounded-xl px-3"><option value="all">All clients</option>{Array.from(new Set(events.map((event) => event.client_name))).sort().map((name) => <option key={name}>{name}</option>)}</select></label>
      </div>
      {query.isPending && <p role="status" className="text-slate-400">Loading calendar?</p>}
      {query.isError && <p role="alert" className="text-amber-300">{query.error instanceof Error ? query.error.message : "Unable to load calendar."}</p>}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="text-center text-xs sm:text-sm text-slate-400 py-2">{day}</div>)}
        {Array.from({ length: offset }, (_, index) => <div key={`empty-${index}`} />)}
        {Array.from({ length: dayCount }, (_, index) => {
          const day = index + 1;
          const dayEvents = visible.filter((event) => Number(event.date.split("-")[2]) === day);
          return <button key={day} onClick={() => setSelectedDay(day)} aria-pressed={selectedDay === day} aria-label={`${day}, ${dayEvents.length} events`} className={`min-w-0 min-h-16 sm:min-h-28 p-1 sm:p-3 text-left rounded-lg border ${selectedDay === day ? "border-blue-400 bg-blue-500/15" : "border-slate-800 bg-slate-900/40"}`}>
            <span className="text-sm">{day}</span>{dayEvents.length > 0 && <><span className="block text-[10px] sm:text-xs text-blue-300 mt-1">{dayEvents.length} events</span><span className="hidden sm:block truncate text-xs text-slate-400 mt-1">{dayEvents[0]?.client_name}</span></>}
          </button>;
        })}
      </div>
      <section aria-label="Selected day events" className="border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">{new Date(year, month.getMonth(), selectedDay).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2>
        {!query.isPending && !query.isError && selected.length === 0 && <p className="text-sm text-slate-400">No events scheduled for this day.</p>}
        {selected.map((event) => <article key={event.id} className="rounded-xl bg-slate-900 p-3 break-words"><h3 className="font-medium">{event.title}</h3><p className="text-sm text-slate-400 mt-1">{event.client_name} ? {event.time} ? {event.type} ? {event.status.replaceAll("_", " ")}</p></article>)}
      </section>
    </div>
  </Container>;
}
