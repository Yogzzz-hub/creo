import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

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

  const content = (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header row */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="size-5 sm:size-6 text-[#7FA0D6]" />
            Content Calendar
          </Heading>
          <p className="text-xs sm:text-sm text-[#97A0B3] font-medium mt-0.5">Scheduled publications and deliverables</p>
        </div>
        <button
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="min-h-10 px-3.5 sm:px-4 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] hover:border-[#7FA0D6]/50 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw size={15} className={query.isFetching ? "animate-spin text-[#7FA0D6]" : "text-[#7FA0D6]"} />
          Refresh
        </button>
      </header>

      {/* Month Navigation & Client Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161F2D] border border-[#2A3446] rounded-2xl p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous month"
            onClick={() => moveMonth(-1)}
            className="p-2 sm:p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:bg-[#2A3446] text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm sm:text-lg font-bold text-white min-w-36 text-center">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <button
            aria-label="Next month"
            onClick={() => moveMonth(1)}
            className="p-2 sm:p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:bg-[#2A3446] text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <label className="text-xs sm:text-sm font-semibold text-[#97A0B3] flex items-center gap-2">
          Client:
          <select
            value={client}
            onChange={(event) => setClient(event.target.value)}
            className="min-h-9 max-w-44 sm:max-w-56 bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
          >
            <option value="all">All clients</option>
            {Array.from(new Set(events.map((event) => event.client_name))).sort().map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      {query.isPending && (
        <div className="p-4 rounded-xl bg-[#161F2D] border border-[#2A3446] text-xs text-[#7FA0D6] flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin" />
          Loading content calendar...
        </div>
      )}
      {query.isError && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 font-bold">
          {query.error instanceof Error ? query.error.message : "Unable to load calendar."}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-2 sm:p-4 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#97A0B3] py-1.5 sm:py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: offset }, (_, index) => (
            <div key={`empty-${index}`} className="min-h-12 sm:min-h-24 rounded-xl bg-[#0B111C]/30 opacity-40" />
          ))}
          {Array.from({ length: dayCount }, (_, index) => {
            const day = index + 1;
            const dayEvents = visible.filter((event) => Number(event.date.split("-")[2]) === day);
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                aria-pressed={isSelected}
                aria-label={`${day}, ${dayEvents.length} events`}
                className={`min-w-0 min-h-12 sm:min-h-24 p-1.5 sm:p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#7FA0D6] bg-[#7FA0D6]/20 shadow-[0_0_12px_rgba(127,160,214,0.25)]"
                    : "border-[#2A3446] bg-[#0B111C] hover:border-[#7FA0D6]/40 hover:bg-[#161F2D]"
                }`}
              >
                <span className={`text-xs sm:text-sm font-bold ${isSelected ? "text-white" : "text-slate-300"}`}>{day}</span>
                {dayEvents.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <span className="block text-[9px] sm:text-[11px] font-extrabold text-[#7FA0D6] truncate">
                      {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
                    </span>
                    <span className="hidden sm:block truncate text-[10px] text-[#97A0B3]">
                      {dayEvents[0]?.client_name}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Event List */}
      <section aria-label="Selected day events" className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
        <h2 className="text-sm sm:text-base font-black text-white">
          {new Date(year, month.getMonth(), selectedDay).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </h2>
        {!query.isPending && !query.isError && selected.length === 0 && (
          <p className="text-xs sm:text-sm text-[#97A0B3]">No events scheduled for this day.</p>
        )}
        <div className="space-y-2.5">
          {selected.map((event) => (
            <article key={event.id} className="rounded-xl bg-[#0B111C] border border-[#2A3446] p-3 sm:p-4 break-words space-y-1 hover:border-[#7FA0D6]/40 transition-colors">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white">{event.title}</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                  {event.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-xs text-[#97A0B3] flex items-center gap-1.5 flex-wrap">
                <span className="text-white font-medium">{event.client_name}</span>
                <span>•</span>
                <span>{event.time}</span>
                <span>•</span>
                <span className="text-[#BCCCE6]">{event.type}</span>
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  if (embedded) {
    return <Container className="text-slate-100">{content}</Container>;
  }

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-slate-100 flex flex-col">
      <AdminTopHeader activeTab="Calendar" />
      <Container className="flex-1 p-3.5 sm:px-6 lg:px-8 sm:py-6">
        {content}
      </Container>
    </div>
  );
}
