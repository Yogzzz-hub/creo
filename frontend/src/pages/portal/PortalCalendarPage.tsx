import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

type DeliverableType = "poster" | "reel" | "story" | "shoot_day";

interface CalendarEntry {
  id: string;
  title?: string;
  date: string;
  scheduled_at?: string;
  status: string;
  file_url?: string;
  file_type?: string;
  type?: DeliverableType;
  topic?: string;
}

const TYPE_CONFIG: Record<DeliverableType, { label: string; letter: string; bg: string; text: string; badgeBg: string }> = {
  poster: {
    label: "Poster",
    letter: "P",
    bg: "bg-[#6BAED6] hover:bg-[#529ec9]",
    text: "text-white",
    badgeBg: "bg-black/20",
  },
  reel: {
    label: "Reel",
    letter: "R",
    bg: "bg-[#9B59B6] hover:bg-[#8e44ad]",
    text: "text-white",
    badgeBg: "bg-black/20",
  },
  story: {
    label: "Story",
    letter: "S",
    bg: "bg-[#F0A87E] hover:bg-[#e59567]",
    text: "text-white",
    badgeBg: "bg-black/20",
  },
  shoot_day: {
    label: "Shoot Day",
    letter: "SD",
    bg: "bg-[#0EA5E9] hover:bg-[#0284c7]",
    text: "text-white",
    badgeBg: "bg-black/20",
  },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function PortalCalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const { data: subData, isLoading: isSubLoading } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
  });

  const isExpired =
    subData?.is_expired === true ||
    subData?.subscription?.status === "expired" ||
    subData?.subscription?.status === "canceled";

  const isSubscribed =
    !isExpired &&
    !!subData?.subscription &&
    (subData?.is_active ?? ["active", "trialing"].includes(subData?.subscription?.status));

  const { data: rawEntries = [] } = useQuery<CalendarEntry[]>({
    queryKey: ["calendar-entries", user?.id],
    queryFn: async () => {
      try {
        const res = await request<CalendarEntry[]>("/api/v1/calendar/entries");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isSubscribed,
  });

  const entries: CalendarEntry[] = rawEntries.map((e) => ({
    ...e,
    type: e.type || (e.file_type?.toLowerCase().includes("video") ? "reel" : "poster"),
    topic: e.topic || e.title || "Scheduled Deliverable",
  }));

  const navigateMonth = (direction: number) => {
    const totalMonths = currentYear * 12 + currentMonth + direction;
    const newYear = Math.floor(totalMonths / 12);
    const newMonth = ((totalMonths % 12) + 12) % 12;
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  // Entries filtered for current month
  const filteredEntries = entries.filter((e) => {
    const d = new Date(e.date + "T00:00:00");
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  // Quota totals
  const quota = { poster: 0, reel: 0, story: 0, shoot_day: 0 };
  filteredEntries.forEach((e) => {
    const t = e.type || "poster";
    if (t in quota) quota[t as DeliverableType]++;
  });

  // Calendar cells
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const getDayEntries = (day: number) => {
    return filteredEntries.filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d.getDate() === day;
    });
  };

  const selectedDayEntries = selectedDay ? getDayEntries(selectedDay) : [];

  // If user hasn't completed payment in onboarding (stage < 4), lock immediately on frame 0 without waiting
  const isUnpaidOnboarding = (user?.onboarding_stage ?? 1) < 4;

  if (isUnpaidOnboarding) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Publishing Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your scheduled content for the month.
          </p>
        </div>
        <SubscriptionLockedState
          title="Publishing Calendar Locked"
          description="Access to scheduled content, multi-platform publishing dates, and asset timelines requires an active production retainer. Choose a plan to unlock calendar workflows."
        />
      </div>
    );
  }

  // While checking subscription status for onboarded users, show clean loading state instead of flashing unlocked UI
  if (isSubLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Publishing Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your scheduled content for the month.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[320px]">
          <Loader2 className="size-8 text-[#2B7BC4] animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Checking workspace access...</p>
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Publishing Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your scheduled content for the month.
          </p>
        </div>
        <SubscriptionLockedState
          title={isExpired ? "Creative Retainer Expired" : "Publishing Calendar Locked"}
          description={
            isExpired
              ? "Your monthly creative retainer billing cycle has concluded. Publishing schedule inspect and calendar actions are paused until you renew."
              : "Access to scheduled content, multi-platform publishing dates, and asset timelines requires an active production retainer. Choose a plan to unlock calendar workflows."
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in">
      {/* ── Top Header & Quota Bar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Publishing Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your scheduled content for the month. Click any date to inspect queue details.
          </p>
        </div>

        {/* Quota pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1.5 rounded-full bg-[#6BAED6]/15 px-2.5 py-1 text-[#2B7BC4] border border-[#6BAED6]/30">
            <span className="inline-flex size-4 items-center justify-center rounded bg-[#6BAED6] text-[9px] font-bold text-white">
              P
            </span>
            <span>{quota.poster} POSTERS</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-[#9B59B6]/15 px-2.5 py-1 text-[#8e44ad] border border-[#9B59B6]/30">
            <span className="inline-flex size-4 items-center justify-center rounded bg-[#9B59B6] text-[9px] font-bold text-white">
              R
            </span>
            <span>{quota.reel} REELS</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-[#F0A87E]/15 px-2.5 py-1 text-[#d97c47] border border-[#F0A87E]/30">
            <span className="inline-flex size-4 items-center justify-center rounded bg-[#F0A87E] text-[9px] font-bold text-white">
              S
            </span>
            <span>{quota.story} STORIES</span>
          </span>
        </div>
      </div>

      {/* ── Calendar Card Container ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-xl hover:bg-[#E8F4FD] text-slate-600 hover:text-[#2B7BC4] transition-all cursor-pointer"
            aria-label="Previous Month"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold text-[#0D2137]">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            className="p-2 rounded-xl hover:bg-[#E8F4FD] text-slate-600 hover:text-[#2B7BC4] transition-all cursor-pointer"
            aria-label="Next Month"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Weekdays Header & Day Grid */}
        <div className="grid grid-cols-7 gap-px rounded-xl border border-slate-200 bg-slate-200 overflow-hidden shadow-2xs">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="bg-slate-50 py-2.5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}

          {/* Cells */}
          {calendarCells.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="bg-slate-50/60 min-h-[90px] sm:min-h-[110px]"
                />
              );
            }

            const dayEntries = getDayEntries(day);
            const isToday = isCurrentMonth && today.getDate() === day;
            const isSelected = selectedDay === day;

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`bg-white p-1.5 sm:p-2 min-h-[90px] sm:min-h-[110px] flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected ? "ring-2 ring-inset ring-[#2B7BC4] bg-[#E8F4FD]/40" : "hover:bg-slate-50/80"
                } ${isToday && !isSelected ? "bg-[#E8F4FD]/30" : ""}`}
              >
                {/* Day number header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? "flex size-5 items-center justify-center rounded-full bg-[#2B7BC4] text-white shadow-xs"
                        : isSelected
                        ? "text-[#2B7BC4] font-extrabold"
                        : "text-slate-700"
                    }`}
                  >
                    {day}
                  </span>
                  {dayEntries.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                      {dayEntries.length} {dayEntries.length === 1 ? "item" : "items"}
                    </span>
                  )}
                </div>

                {/* Scheduled item badges */}
                <div className="flex sm:flex-col flex-row flex-wrap gap-0.5 sm:gap-1 flex-1 justify-center sm:justify-start">
                  {dayEntries.map((entry) => {
                    const config = TYPE_CONFIG[entry.type || "poster"] || TYPE_CONFIG.poster;
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-1 rounded-md p-1 sm:px-1.5 sm:py-1 text-left text-[11px] font-semibold shadow-2xs transition-all ${config.bg} ${config.text}`}
                        title={entry.topic}
                      >
                        <span
                          className={`inline-flex size-3.5 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white ${config.badgeBg}`}
                        >
                          {config.letter}
                        </span>
                        <span className="hidden sm:inline truncate text-[11px] font-medium leading-tight">
                          {entry.topic}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Day Details Panel ────────────────────────────────────────────── */}
      {selectedDay && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-[#0D2137] flex items-center gap-2">
              <CalendarIcon className="size-4 text-[#2B7BC4]" />
              Schedule for {MONTH_NAMES[currentMonth]} {selectedDay}, {currentYear}
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {selectedDayEntries.length} items queued
            </span>
          </div>

          {selectedDayEntries.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">
              No creative posts scheduled for this day. Click another date or submit a ticket to request a slot.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDayEntries.map((entry) => {
                const config = TYPE_CONFIG[entry.type || "poster"] || TYPE_CONFIG.poster;
                return (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 hover:border-[#2B7BC4]/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${config.bg}`}>
                        {config.label}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        {entry.status}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#0D2137]">{entry.topic}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="size-3" />
                      Auto-publish scheduled
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
