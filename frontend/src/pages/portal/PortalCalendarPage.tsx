import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  Video,
  Image as ImageIcon,
  Grid,
  List,
  CheckCircle2,
  ExternalLink,
  X,
  Layers,
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

type DeliverableType = "poster" | "reel" | "story" | "carousel" | "shoot_day";

interface CalendarEntry {
  id: string;
  deliverable_id?: string;
  title?: string;
  date: string;
  scheduled_at?: string;
  scheduled_time?: string;
  status: string;
  raw_status?: string;
  file_url?: string;
  file_type?: string;
  thumbnail_url?: string;
  type?: DeliverableType;
  format_label?: string;
  topic?: string;
  caption?: string;
  permalink?: string;
  version?: number;
}

interface TypeConfig {
  label: string;
  icon: typeof Video;
  badgeBg: string;
  badgeText: string;
  border: string;
  softBg: string;
  pillBg: string;
}

const DEFAULT_TYPE_CONFIG: TypeConfig = {
  label: "Poster",
  icon: ImageIcon,
  badgeBg: "bg-[#2B7BC4]",
  badgeText: "text-white",
  border: "border-blue-200",
  softBg: "bg-blue-50 text-[#1E609A] hover:bg-blue-100",
  pillBg: "bg-blue-600/10 text-[#1E609A] border-blue-200",
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  reel: {
    label: "Reel",
    icon: Video,
    badgeBg: "bg-purple-600",
    badgeText: "text-white",
    border: "border-purple-200",
    softBg: "bg-purple-50 text-purple-700 hover:bg-purple-100",
    pillBg: "bg-purple-600/10 text-purple-700 border-purple-200",
  },
  poster: DEFAULT_TYPE_CONFIG,
  story: {
    label: "Story",
    icon: Layers,
    badgeBg: "bg-amber-600",
    badgeText: "text-white",
    border: "border-amber-200",
    softBg: "bg-amber-50 text-amber-800 hover:bg-amber-100",
    pillBg: "bg-amber-600/10 text-amber-800 border-amber-200",
  },
  carousel: {
    label: "Carousel",
    icon: Layers,
    badgeBg: "bg-amber-600",
    badgeText: "text-white",
    border: "border-amber-200",
    softBg: "bg-amber-50 text-amber-800 hover:bg-amber-100",
    pillBg: "bg-amber-600/10 text-amber-800 border-amber-200",
  },
};

function getTypeConfig(type?: string): TypeConfig {
  if (!type) return DEFAULT_TYPE_CONFIG;
  const key = type.toLowerCase();
  return TYPE_CONFIG[key] ?? DEFAULT_TYPE_CONFIG;
}

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
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"month" | "list">("month");
  const [previewEntry, setPreviewEntry] = useState<CalendarEntry | null>(null);

  const { data: subData, isLoading: isSubLoading } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isExpired =
    subData?.is_expired === true ||
    subData?.subscription?.status === "expired" ||
    subData?.subscription?.status === "canceled";

  const isStaffOrAdmin = user?.role && user.role !== "client";

  const isSubscribed =
    isStaffOrAdmin ||
    (!isExpired &&
      (subData?.is_active === true ||
        (!!subData?.subscription && ["active", "trialing"].includes(subData?.subscription?.status))));

  const { data: rawEntries = [], isLoading: isEntriesLoading } = useQuery<CalendarEntry[]>({
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

  const entries: CalendarEntry[] = useMemo(() => {
    return rawEntries.map((e) => {
      let resolvedType: DeliverableType = "poster";
      const rawType = (e.type || "").toLowerCase();
      const rawFile = (e.file_type || "").toLowerCase();

      if (rawType.includes("reel") || rawFile.includes("video") || rawFile.includes("mp4")) {
        resolvedType = "reel";
      } else if (rawType.includes("story") || rawType.includes("carousel")) {
        resolvedType = "story";
      } else {
        resolvedType = "poster";
      }

      // Friendly display title
      let displayTopic = e.topic || e.title || "";
      if (!displayTopic || displayTopic.toLowerCase().includes("deliverable v")) {
        displayTopic = `Brand ${resolvedType.toUpperCase()} · Scheduled Publication`;
      }

      return {
        ...e,
        type: resolvedType,
        format_label: TYPE_CONFIG[resolvedType]?.label || "Post",
        topic: displayTopic,
        scheduled_time: e.scheduled_time || "11:00 AM",
      };
    });
  }, [rawEntries]);

  const navigateMonth = (direction: number) => {
    const totalMonths = currentYear * 12 + currentMonth + direction;
    const newYear = Math.floor(totalMonths / 12);
    const newMonth = ((totalMonths % 12) + 12) % 12;
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  // Filter entries by current month
  const monthEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date + "T00:00:00");
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [entries, currentYear, currentMonth]);

  // Filtered by selected format (all / reel / poster / story)
  const filteredEntries = useMemo(() => {
    if (selectedFormat === "all") return monthEntries;
    return monthEntries.filter((e) => (e.type || "").toLowerCase() === selectedFormat);
  }, [monthEntries, selectedFormat]);

  // Overall counts for month
  const quota = useMemo(() => {
    const counts = { total: monthEntries.length, reel: 0, poster: 0, story: 0 };
    monthEntries.forEach((e) => {
      const t = (e.type || "poster") as "reel" | "poster" | "story";
      if (t in counts) counts[t]++;
    });
    return counts;
  }, [monthEntries]);

  // Calendar cells for grid
  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Pad trailing cells to maintain complete 7-column rows
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstDay, daysInMonth]);

  const getDayEntries = (day: number) => {
    return filteredEntries.filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d.getDate() === day;
    });
  };

  const selectedDayEntries = selectedDay ? getDayEntries(selectedDay) : [];

  if (isSubLoading || isEntriesLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Publishing Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Loading your 30-day feasible creative roadmap...
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[320px]">
          <Loader2 className="size-8 text-[#2B7BC4] animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Syncing scheduled deliverables...</p>
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Publishing Calendar
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
    <div className="mx-auto max-w-6xl space-y-5 animate-page-in pb-12">
      {/* ── Top Header & Stats Bar ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-5 text-[#2B7BC4]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
              Publishing Roadmap
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Retainer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-normal">
            Automated 30-day feasible calendar with dedicated creative pod assignment.
          </p>
        </div>

        {/* View Switcher & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Format Filter Tabs */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedFormat("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedFormat === "all"
                  ? "bg-white text-[#0D2137] shadow-xs font-bold"
                  : "text-slate-600 hover:text-[#0D2137]"
              }`}
            >
              All ({quota.total})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat("reel")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedFormat === "reel"
                  ? "bg-white text-purple-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-purple-700"
              }`}
            >
              <Video className="size-3.5" />
              <span>Reels ({quota.reel})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat("poster")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedFormat === "poster"
                  ? "bg-white text-[#2B7BC4] shadow-xs font-bold"
                  : "text-slate-600 hover:text-[#2B7BC4]"
              }`}
            >
              <ImageIcon className="size-3.5" />
              <span>Posters ({quota.poster})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat("story")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedFormat === "story"
                  ? "bg-white text-amber-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-amber-700"
              }`}
            >
              <Layers className="size-3.5" />
              <span>Stories ({quota.story})</span>
            </button>
          </div>

          {/* Grid vs List View Mode */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "month"
                  ? "bg-white text-[#2B7BC4] shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="Month Grid View"
            >
              <Grid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-[#2B7BC4] shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="Timeline List View"
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Calendar Card Container ──────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs">
        {/* Month Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200/80 p-0.5">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg hover:bg-white text-slate-600 hover:text-[#2B7BC4] transition-all cursor-pointer"
                aria-label="Previous Month"
              >
                <ChevronLeft className="size-4.5" />
              </button>
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg hover:bg-white text-slate-600 hover:text-[#2B7BC4] transition-all cursor-pointer"
                aria-label="Next Month"
              >
                <ChevronRight className="size-4.5" />
              </button>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#0D2137]">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Today
            </button>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              {filteredEntries.length} items visible
            </span>
          </div>
        </div>

        {/* ── Month Grid View ────────────────────────────────────────────── */}
        {viewMode === "month" ? (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Weekday Header Columns */}
              <div className="grid grid-cols-7 gap-px rounded-t-xl border-t border-x border-slate-200 bg-slate-100">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="bg-slate-50 py-2.5 text-center text-xs font-extrabold text-slate-500 uppercase tracking-wider"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-px border border-slate-200 bg-slate-200 rounded-b-xl overflow-hidden">
                {calendarCells.map((day, index) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="bg-slate-50/50 min-h-[105px] sm:min-h-[115px]"
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
                      className={`bg-white p-2 min-h-[105px] sm:min-h-[115px] flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-inset ring-[#2B7BC4] bg-[#F0F7FD]/70"
                          : "hover:bg-slate-50/80"
                      } ${isToday && !isSelected ? "bg-[#F0F7FD]/30" : ""}`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-bold leading-none ${
                            isToday
                              ? "flex size-6 items-center justify-center rounded-full bg-[#2B7BC4] text-white shadow-xs"
                              : isSelected
                              ? "text-[#2B7BC4] font-extrabold"
                              : "text-slate-700"
                          }`}
                        >
                          {day}
                        </span>
                        {dayEntries.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {dayEntries.length} {dayEntries.length === 1 ? "item" : "items"}
                          </span>
                        )}
                      </div>

                      {/* Scheduled Deliverables Badges */}
                      <div className="space-y-1 flex-1">
                        {dayEntries.slice(0, 2).map((entry) => {
                          const config = getTypeConfig(entry.type);
                          const Icon = config.icon;
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDay(day);
                                setPreviewEntry(entry);
                              }}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs hover:scale-[1.01] ${config.softBg} ${config.border}`}
                              title={`${config.label}: ${entry.topic}`}
                            >
                              <Icon className="size-3 shrink-0" />
                              <span className="truncate flex-1 font-bold text-[10.5px]">
                                {config.label}
                              </span>
                              <span className="text-[9.5px] opacity-75 shrink-0 hidden sm:inline">
                                {entry.scheduled_time || "11 AM"}
                              </span>
                            </button>
                          );
                        })}

                        {dayEntries.length > 2 && (
                          <div className="text-[10px] font-bold text-[#2B7BC4] text-center pt-0.5">
                            +{dayEntries.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ── Agenda / Timeline List View ───────────────────────────────── */
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No deliverables found for this filter in {MONTH_NAMES[currentMonth]} {currentYear}.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const config = getTypeConfig(entry.type);
                const Icon = config.icon;
                const isApproved = entry.status === "approved";

                return (
                  <div
                    key={entry.id}
                    onClick={() => setPreviewEntry(entry)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#2B7BC4]/40 hover:shadow-xs transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${config.badgeBg} text-white shadow-xs`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.pillBg}`}>
                            {config.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <Clock className="size-3" />
                            {entry.date} · {entry.scheduled_time || "11:00 AM"}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-[#0D2137] truncate mt-1">
                          {entry.topic}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-[#1E609A]"
                      }`}>
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            <span>Approved</span>
                          </>
                        ) : (
                          <>
                            <Clock className="size-3 text-blue-600" />
                            <span>Scheduled</span>
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewEntry(entry);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                        title="View details"
                      >
                        <ExternalLink className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Selected Day Summary Drawer ───────────────────────────────────── */}
      {selectedDay && selectedDayEntries.length > 0 && viewMode === "month" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-[#0D2137] flex items-center gap-2">
              <CalendarIcon className="size-4.5 text-[#2B7BC4]" />
              <span>
                Schedule for {MONTH_NAMES[currentMonth]} {selectedDay}, {currentYear}
              </span>
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              {selectedDayEntries.length} {selectedDayEntries.length === 1 ? "deliverable" : "deliverables"} queued
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {selectedDayEntries.map((entry) => {
              const config = getTypeConfig(entry.type);
              const Icon = config.icon;
              return (
                <div
                  key={entry.id}
                  onClick={() => setPreviewEntry(entry)}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-[#2B7BC4]/40 hover:shadow-xs transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${config.pillBg}`}>
                      <Icon className="size-3" />
                      <span>{config.label}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="size-3" />
                      {entry.scheduled_time || "11:00 AM"}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-[#0D2137] leading-snug line-clamp-2">
                    {entry.topic}
                  </p>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      <span>Ready to Publish</span>
                    </span>
                    <span className="text-[#2B7BC4] font-semibold hover:underline">
                      Inspect →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Interactive Asset Preview Modal ───────────────────────────────── */}
      {previewEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
          onClick={() => setPreviewEntry(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-page-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  getTypeConfig(previewEntry.type).pillBg
                }`}>
                  {previewEntry.format_label || "Deliverable"}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Scheduled for {previewEntry.date}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEntry(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Media Player / Preview */}
            <div className="bg-slate-900 flex items-center justify-center min-h-[220px] max-h-[300px] overflow-hidden relative">
              {previewEntry.type === "reel" || previewEntry.file_type?.toLowerCase().includes("video") ? (
                <video
                  src={previewEntry.file_url}
                  controls
                  playsInline
                  autoPlay
                  muted
                  className="max-h-[280px] w-auto mx-auto object-contain"
                />
              ) : (
                <img
                  src={previewEntry.file_url}
                  alt={previewEntry.topic}
                  className="max-h-[280px] w-auto mx-auto object-contain"
                />
              )}
            </div>

            {/* Content Details */}
            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#0D2137]">
                  {previewEntry.topic}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#2B7BC4]" />
                  <span>Scheduled Publication: {previewEntry.date} at {previewEntry.scheduled_time || "11:00 AM"} UTC</span>
                </p>
              </div>

              {previewEntry.caption && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Editorial Caption
                  </span>
                  {previewEntry.caption}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Link
                  to="/portal/deliverables"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2B7BC4] hover:bg-[#1A5EA8] text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <span>Open in Deliverables Dock</span>
                  <ExternalLink className="size-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPreviewEntry(null)}
                  className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalCalendarPage;
