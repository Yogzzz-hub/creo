import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Sparkles,
  RotateCcw,
  Music,
  ShieldCheck,
  Film,
  Target,
  Zap,
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import type { CreativeBlueprint, BlueprintHook } from "../../types/api";

type DeliverableType = "poster" | "reel" | "story" | "carousel" | "shoot_day";

interface CalendarEntry {
  id: string;
  deliverable_id?: string;
  title?: string;
  date: string;
  scheduled_at?: string;
  scheduled_time?: string;
  status: string;
  calendar_status?: string;
  is_locked?: boolean;
  slot_kind?: string;
  slot_strategy?: "anchor" | "flex" | "swapped";
  flex_deadline?: string | null;
  concept_status?: "concept_pending" | "concept_revision" | "concept_approved" | "approved";
  selected_hook?: BlueprintHook | null;
  blueprint?: CreativeBlueprint | null;
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
  const [isApproving, setIsApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);
  const [selectedHookIndex, setSelectedHookIndex] = useState<number>(0);
  const [isConceptSubmitting, setIsConceptSubmitting] = useState<boolean>(false);
  const [conceptFeedback, setConceptFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [flexTheme, setFlexTheme] = useState<string>("");
  const [isProposingFlex, setIsProposingFlex] = useState<boolean>(false);
  const queryClient = useQueryClient();

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

  const hasDraftSlots = useMemo(() => {
    return entries.some((e) => e.calendar_status === "draft");
  }, [entries]);

  const handleApproveCalendar = async () => {
    setIsApproving(true);
    setApprovalMessage(null);
    try {
      const res = await request<any>("/api/v1/calendar/approve", {
        method: "POST",
      });
      setApprovalMessage(`Campaign approved! Locked ${res.approved_slots ?? "all"} slots & dispatched rolling window.`);
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
    } catch (err: any) {
      setApprovalMessage(err.message || "Failed to approve calendar plan.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleApproveConcept = async () => {
    if (!previewEntry || !previewEntry.blueprint?.hooks?.length) return;
    setIsConceptSubmitting(true);
    setConceptFeedback(null);
    try {
      const chosenHook = previewEntry.blueprint.hooks[selectedHookIndex] || previewEntry.blueprint.hooks[0];
      await request<any>(`/api/v1/calendar/slots/${previewEntry.id}/approve-concept`, {
        method: "POST",
        body: JSON.stringify({ selected_hook: chosenHook }),
      });
      setPreviewEntry({
        ...previewEntry,
        concept_status: "concept_approved",
        selected_hook: chosenHook,
      });
      setConceptFeedback({
        text: "Concept & Hook approved! The task has been dispatched to your pod editor.",
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
    } catch (err: any) {
      setConceptFeedback({ text: err.message || "Failed to approve concept.", type: "error" });
    } finally {
      setIsConceptSubmitting(false);
    }
  };

  const handleRerollConcept = async () => {
    if (!previewEntry) return;
    setIsConceptSubmitting(true);
    setConceptFeedback(null);
    try {
      const res = await request<any>(`/api/v1/calendar/slots/${previewEntry.id}/reroll-concept`, {
        method: "POST",
      });
      setPreviewEntry({
        ...previewEntry,
        blueprint: res.blueprint,
        concept_status: "concept_pending",
        selected_hook: res.blueprint?.hooks?.[0],
      });
      setSelectedHookIndex(0);
      setConceptFeedback({
        text: `New angle generated! ${res.remaining_daily_rerolls ?? "Several"} re-rolls remaining today.`,
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
    } catch (err: any) {
      setConceptFeedback({
        text: err.message || "Daily re-roll quota reached (5/5). Try again tomorrow.",
        type: "error",
      });
    } finally {
      setIsConceptSubmitting(false);
    }
  };

  const handleProposeFlex = async () => {
    if (!previewEntry || !flexTheme.trim()) return;
    setIsProposingFlex(true);
    setConceptFeedback(null);
    try {
      const res = await request<any>(`/api/v1/calendar/flex/${previewEntry.id}/propose`, {
        method: "POST",
        body: JSON.stringify({ theme: flexTheme.trim() }),
      });
      setPreviewEntry({
        ...previewEntry,
        slot_strategy: "swapped",
        blueprint: res.blueprint,
        concept_status: "concept_pending",
      });
      setFlexTheme("");
      setConceptFeedback({
        text: "Flex slot filled with custom trend topic! Blueprint generated.",
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
    } catch (err: any) {
      setConceptFeedback({ text: err.message || "Failed to propose flex topic.", type: "error" });
    } finally {
      setIsProposingFlex(false);
    }
  };

  const openEntryModal = (entry: CalendarEntry) => {
    setPreviewEntry(entry);
    setConceptFeedback(null);
    if (entry.blueprint?.hooks?.length) {
      if (entry.selected_hook) {
        const foundIdx = entry.blueprint.hooks.findIndex(
          (h) => h.text === (entry.selected_hook as any).text
        );
        setSelectedHookIndex(foundIdx >= 0 ? foundIdx : 0);
      } else {
        setSelectedHookIndex(0);
      }
    }
  };

  if (isSubLoading || isEntriesLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#2B7BC4]" />
      </div>
    );
  }

  if (!isSubscribed) {
    return <SubscriptionLockedState />;
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header & Action Bar ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-5 text-[#2B7BC4]" />
              <h1 className="text-xl sm:text-2xl font-black text-[#0D2137] tracking-tight">
                Editorial Calendar & Intelligence
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Production-ready blueprints, 70/30 anchor + flex strategy, and hook concept approvals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/portal/deliverables"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors"
            >
              <span>Deliverables Dock</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Campaign Approval Banner if draft slots exist */}
        {hasDraftSlots && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="size-4 text-amber-600" />
                Monthly Campaign Schedule Draft Ready
              </p>
              <p className="text-amber-700">
                Review your 70/30 anchor and flex slots. Approving will lock the calendar and dispatch production briefs.
              </p>
            </div>
            <button
              type="button"
              onClick={handleApproveCalendar}
              disabled={isApproving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isApproving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5 text-emerald-300" />}
              <span>{isApproving ? "Approving Plan..." : "Approve 30-Day Campaign"}</span>
            </button>
          </div>
        )}

        {approvalMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-semibold flex items-center justify-between">
            <span>{approvalMessage}</span>
            <button type="button" onClick={() => setApprovalMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* View Switcher & Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
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
              title="List View"
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Calendar Container ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white shadow-xs">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors rounded-l-xl cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors rounded-r-xl cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="size-4" />
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
                          const isFlex = entry.slot_strategy === "flex" || entry.slot_strategy === "swapped";
                          const isConceptPending = entry.concept_status === "concept_pending";

                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDay(day);
                                openEntryModal(entry);
                              }}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs hover:scale-[1.01] ${config.softBg} ${config.border}`}
                              title={`${config.label}: ${entry.topic}`}
                            >
                              <Icon className="size-3 shrink-0" />
                              <span className="truncate flex-1 font-bold text-[10.5px]">
                                {config.label}
                              </span>
                              {isFlex && (
                                <span className="text-[9px] px-1 rounded bg-amber-500 text-white font-black shrink-0">
                                  FLEX
                                </span>
                              )}
                              {isConceptPending && !isFlex && (
                                <span className="size-1.5 rounded-full bg-amber-500 shrink-0" title="Concept Pending Review" />
                              )}
                            </button>
                          );
                        })}

                        {dayEntries.length > 2 && (
                          <span className="block text-[10px] font-bold text-slate-400 text-center pt-0.5">
                            +{dayEntries.length - 2} more
                          </span>
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
                const isApproved = entry.status === "approved" || entry.concept_status === "concept_approved";
                const isFlex = entry.slot_strategy === "flex" || entry.slot_strategy === "swapped";

                return (
                  <div
                    key={entry.id}
                    onClick={() => openEntryModal(entry)}
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
                          {isFlex ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ⚡ Flex Slot
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1E609A] border border-blue-200">
                              Anchor (70%)
                            </span>
                          )}
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
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            <span>Approved</span>
                          </>
                        ) : (
                          <>
                            <Clock className="size-3 text-amber-600" />
                            <span>Concept Pending</span>
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEntryModal(entry);
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
                  onClick={() => openEntryModal(entry)}
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
                    <span className="text-[#2B7BC4] font-bold inline-flex items-center gap-1">
                      <span>Inspect Blueprint</span>
                    </span>
                    <span className="text-[#2B7BC4] font-semibold hover:underline">
                      Review →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Creative Intelligence Blueprint & Deliverable Review Modal ────── */}
      {previewEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
          onClick={() => setPreviewEntry(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[92vh] rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-y-auto animate-page-in my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  getTypeConfig(previewEntry.type).pillBg
                }`}>
                  {previewEntry.format_label || "Deliverable"}
                </span>

                {previewEntry.slot_strategy === "flex" || previewEntry.slot_strategy === "swapped" ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ⚡ Flex Slot (30% Buffer)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-blue-50 text-[#1E609A] border border-blue-200">
                    🎯 Anchor Slot (70%)
                  </span>
                )}

                {previewEntry.blueprint?.funnel_stage && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    previewEntry.blueprint.funnel_stage === "reach"
                      ? "bg-sky-100 text-sky-800"
                      : previewEntry.blueprint.funnel_stage === "authority"
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {previewEntry.blueprint.funnel_stage.toUpperCase()} (Funnel Mix)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewEntry(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* If Deliverable Video/Image is Published/Ready */}
            {previewEntry.file_url ? (
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
            ) : null}

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Concept feedback alert */}
              {conceptFeedback && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  conceptFeedback.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}>
                  <span>{conceptFeedback.text}</span>
                  <button type="button" onClick={() => setConceptFeedback(null)} className="cursor-pointer">
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* Flex Slot Propose Section (if strategy is flex or swapped) */}
              {(previewEntry.slot_strategy === "flex" || previewEntry.slot_strategy === "swapped") && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Zap className="size-4 text-amber-600" />
                      Dynamic Flex Hot-Swap Protocol
                    </h4>
                    {previewEntry.flex_deadline && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Auto-converts by: {previewEntry.flex_deadline}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-800/80 leading-relaxed">
                    Have a sudden industry event, feature launch, or viral trend? Fill this flex slot instantly with human-guided direction.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={flexTheme}
                      onChange={(e) => setFlexTheme(e.target.value)}
                      placeholder="e.g. Breaking AI regulation impact or flash founder update..."
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-amber-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleProposeFlex}
                      disabled={isProposingFlex || !flexTheme.trim()}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {isProposingFlex ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                      <span>Generate</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Topic and Publication Details */}
              <div>
                <h3 className="text-lg font-black text-[#0D2137]">
                  {previewEntry.topic}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#2B7BC4]" />
                  <span>Scheduled Publication: {previewEntry.date} at {previewEntry.scheduled_time || "11:00 AM"}</span>
                </p>
              </div>

              {/* Blueprint Premise */}
              {previewEntry.blueprint?.premise && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Core Premise
                  </span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                    {previewEntry.blueprint.premise}
                  </p>
                </div>
              )}

              {/* ── Tier 2: Concept Approval Gate (Hooks A/B/C) ─────────────── */}
              {previewEntry.blueprint?.hooks && previewEntry.blueprint.hooks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-[#0D2137] flex items-center gap-1.5">
                        <Target className="size-4 text-[#2B7BC4]" />
                        <span>Select Concept Hook Angle (A / B / C)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Approve your preferred hook before production starts. Revisions after production cost hours; concept alignment is instant.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRerollConcept}
                      disabled={isConceptSubmitting}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2B7BC4] hover:text-[#1E609A] disabled:opacity-50 cursor-pointer"
                      title="Generate new hook angles (5 daily quota)"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>Re-Roll Angles</span>
                    </button>
                  </div>

                  {/* Hook Selection Cards */}
                  <div className="space-y-2.5">
                    {previewEntry.blueprint.hooks.map((hook, idx) => {
                      const isSelected = selectedHookIndex === idx;
                      const isApprovedHook =
                        previewEntry.concept_status === "concept_approved" &&
                        previewEntry.selected_hook &&
                        (previewEntry.selected_hook as any).text === hook.text;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (previewEntry.concept_status !== "concept_approved") {
                              setSelectedHookIndex(idx);
                            }
                          }}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected || isApprovedHook
                              ? "border-[#2B7BC4] bg-[#F0F7FD] shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="size-5 rounded-full flex items-center justify-center text-[10px] font-black bg-[#2B7BC4] text-white">
                                {idx === 0 ? "A" : idx === 1 ? "B" : "C"}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {hook.angle.replace("_", " ")}
                              </span>
                            </div>

                            {isApprovedHook && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="size-3" />
                                Chosen Hook
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-bold text-[#0D2137] leading-snug">
                            &ldquo;{hook.text}&rdquo;
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            Why it works: {hook.rationale}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Concept Approval Button */}
                  {previewEntry.concept_status !== "concept_approved" ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleApproveConcept}
                        disabled={isConceptSubmitting}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isConceptSubmitting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        <span>
                          Approve Hook {selectedHookIndex === 0 ? "A" : selectedHookIndex === 1 ? "B" : "C"} & Launch Production
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span>Concept Approved! Task dispatched with your selected angle.</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Storyboard & Beats Breakdown ───────────────────────────── */}
              {previewEntry.blueprint?.beats && previewEntry.blueprint.beats.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Film className="size-3.5 text-[#2B7BC4]" />
                    Shot-by-Shot Storyboard Beats
                  </h4>
                  <div className="space-y-2">
                    {previewEntry.blueprint.beats.map((beat, bIdx) => (
                      <div key={bIdx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span className="text-[#2B7BC4] font-extrabold">Shot {bIdx + 1} ({beat.timestamp_range})</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-700 font-semibold text-[10px]">
                            {beat.shot_type}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium">
                          <strong className="text-slate-900">Visual:</strong> {beat.visual_cue}
                        </p>
                        <p className="text-slate-600 italic">
                          <strong className="text-slate-900 not-italic">Voiceover / Script:</strong> &ldquo;{beat.script_line}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Audio Direction & Brand Guardrails ─────────────────────── */}
              {previewEntry.blueprint?.audio_direction && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                      <Music className="size-3" />
                      Actionable Audio Direction
                    </span>
                    <p className="font-bold text-slate-800 text-[11.5px]">
                      {previewEntry.blueprint.audio_direction.genre_mood} · {previewEntry.blueprint.audio_direction.bpm_range}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Rule: {previewEntry.blueprint.audio_direction.vocal_rules}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="size-3 text-emerald-600" />
                      Brand Guardrails Respected
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {previewEntry.blueprint.respects?.map((resp, rIdx) => (
                        <span key={rIdx} className="text-[10.5px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                          ✓ {resp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Editorial Caption (if exists) */}
              {previewEntry.caption && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Editorial Caption & Call to Action
                  </span>
                  {previewEntry.caption}
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <Link
                  to="/portal/deliverables"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2B7BC4] hover:bg-[#1A5EA8] text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <span>Deliverables Dock</span>
                  <ExternalLink className="size-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPreviewEntry(null)}
                  className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
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
