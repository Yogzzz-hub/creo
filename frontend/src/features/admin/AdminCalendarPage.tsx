import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar as CalendarIcon,
  CalendarDays,
  List,
  Video,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  X,
  Film,
  Trash2,
  Eye,
  Check,
  Edit3,
} from "lucide-react";
import { NativeSelect } from "../../ui/NativeSelect";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { StoryApprovalModal } from "../../components/ops/StoryApprovalModal";
import { useConfirm } from "../../components/ui/ConfirmDialog";

export type CalendarEvent = {
  id: string;
  client_id?: string;
  client_email?: string;
  client_name: string;
  deliverable_id?: string | null;
  title: string;
  type: string; // "Reel" | "Poster" | "Story" | "Carousel"
  status: string;
  date: string; // "YYYY-MM-DD"
  day: number;
  month: number;
  year: number;
  time: string;
  caption?: string;
  story_description?: string;
  approval_type?: string;
  team_notes?: string;
  client_feedback?: string;
  file_url?: string | null;
  file_type?: string | null;
  brand_summary?: string | null;
  blueprint?: {
    premise?: string;
    funnel_stage?: string;
    cta?: string;
    hooks?: Array<{ text: string; angle?: string; rationale?: string }>;
    beats?: Array<{ shot_type?: string; script_line?: string; visual_cue?: string; timestamp_range?: string }>;
    audio_direction?: { bpm_range?: string; genre_mood?: string; vocal_rules?: string };
  } | null;
  selected_hook?: { text: string; angle?: string; rationale?: string } | null;
  is_locked?: boolean;
  slot_kind?: string;
  slot_strategy?: string;
  concept_status?: string;
};

type ClientRosterItem = {
  client_id: string;
  email: string;
  company_name?: string | null;
  plan_name?: string;
};

export const FORMAT_CONFIG = {
  reel: {
    label: "Reel",
    icon: Video,
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-300",
    border: "border-purple-500/30",
    chipBg: "bg-purple-500/15",
    chipText: "text-purple-300",
    color: "#A855F7",
  },
  poster: {
    label: "Poster",
    icon: ImageIcon,
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-300",
    border: "border-blue-500/30",
    chipBg: "bg-blue-500/15",
    chipText: "text-[#7FA0D6]",
    color: "#3B82F6",
  },
  post: {
    label: "Post",
    icon: ImageIcon,
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-300",
    border: "border-blue-500/30",
    chipBg: "bg-blue-500/15",
    chipText: "text-[#7FA0D6]",
    color: "#3B82F6",
  },
  story: {
    label: "Story",
    icon: Sparkles,
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    border: "border-amber-500/30",
    chipBg: "bg-amber-500/15",
    chipText: "text-amber-300",
    color: "#F59E0B",
  },
  carousel: {
    label: "Carousel",
    icon: Layers,
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    border: "border-emerald-500/30",
    chipBg: "bg-emerald-500/15",
    chipText: "text-emerald-300",
    color: "#10B981",
  },
};

export function getFormatConfig(type?: string) {
  if (!type) return FORMAT_CONFIG.poster;
  const key = type.toLowerCase();
  if (key.includes("reel") || key.includes("video")) return FORMAT_CONFIG.reel;
  if (key.includes("story")) return FORMAT_CONFIG.story;
  if (key.includes("carousel")) return FORMAT_CONFIG.carousel;
  return FORMAT_CONFIG.poster;
}

export function AdminCalendarPage({ embedded = false }: { embedded?: boolean } = {}) {
  const Container = embedded ? "section" : "main";
  const { user } = useAuth();
  const canSchedulePublication = user?.role === "admin" || user?.role === "super_admin";
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Calendar State
  const [calendarView, setCalendarView] = useState<"month" | "week" | "agenda">("month");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  // Filter State
  const [selectedClient, setSelectedClient] = useState("all");
  const [formatFilter, setFormatFilter] = useState<"all" | "reel" | "poster" | "story">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals State
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [inspectEvent, setInspectEvent] = useState<CalendarEvent | null>(null);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<CalendarEvent | null>(null);

  // New Event Form State
  const [newClient, setNewClient] = useState("");
  const [newFormat, setNewFormat] = useState("Reel");
  const [newDate, setNewDate] = useState(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${mm}-${dd}`;
  });
  const [newTime, setNewTime] = useState("11:00");
  const [newCaption, setNewCaption] = useState("");
  const [newStatus, setNewStatus] = useState("scheduled");
  const [formError, setFormError] = useState("");

  const year = month.getFullYear();
  const monthNumber = month.getMonth() + 1;

  // 1. Fetch Calendar Events from Real Backend DB
  const calendarQuery = useQuery({
    queryKey: ["admin-calendar", user?.id, year, monthNumber],
    queryFn: () => request<CalendarEvent[]>(`/api/v1/admin/calendar?month=${monthNumber}&year=${year}`),
    enabled: !!user?.id,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  // 2. Fetch Client Roster for Admin Selection
  const clientsQuery = useQuery({
    queryKey: ["admin-client-roster", user?.id],
    queryFn: () => request<ClientRosterItem[]>("/api/v1/admin/clients"),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const events = calendarQuery.data ?? [];
  const clientRoster = clientsQuery.data ?? [];

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: (payload: {
      client_id: string;
      publish_date: string;
      scheduled_time?: string;
      format_type: string;
      caption?: string;
      status: string;
    }) => request("/api/v1/admin/calendar/events", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });
      setIsScheduleOpen(false);
      setNewCaption("");
      setFormError("");
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to schedule event.");
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      publish_date?: string;
      scheduled_time?: string;
      caption?: string;
      status?: string;
      format_type?: string;
    }) => request(`/api/v1/admin/calendar/events/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });
      if (inspectEvent && inspectEvent.id === variables.id) {
        setInspectEvent((prev) => (prev ? { ...prev, ...variables } : null));
      }
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => request(`/api/v1/admin/calendar/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });
      setInspectEvent(null);
    },
  });

  // Computed Filters
  const visible = useMemo(() => {
    return events.filter((ev) => {
      // Client filter
      if (selectedClient !== "all" && ev.client_name !== selectedClient && ev.client_id !== selectedClient) {
        return false;
      }
      // Format filter
      if (formatFilter !== "all") {
        const typeKey = ev.type?.toLowerCase() || "";
        if (formatFilter === "reel" && !typeKey.includes("reel") && !typeKey.includes("video")) return false;
        // "story" covers carousels too, mirroring the Stories & Carousels metric card.
        if (
          formatFilter === "story" &&
          !typeKey.includes("story") &&
          !typeKey.includes("carousel")
        )
          return false;
        if (formatFilter === "poster" && (typeKey.includes("reel") || typeKey.includes("story") || typeKey.includes("carousel"))) return false;
      }
      // Status filter
      if (statusFilter !== "all" && ev.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (ev.title || "").toLowerCase().includes(q);
        const matchClient = (ev.client_name || "").toLowerCase().includes(q);
        const matchCaption = (ev.caption || "").toLowerCase().includes(q);
        const matchHook = (ev.selected_hook?.text || "").toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchCaption && !matchHook) return false;
      }
      return true;
    });
  }, [events, selectedClient, formatFilter, statusFilter, searchQuery]);

  // Calendar Math
  const dayCount = new Date(year, monthNumber, 0).getDate();
  const offset = month.getDay(); // 0 for Sunday-first matching ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  const selectedDayEvents = visible.filter((ev) => Number(ev.date.split("-")[2]) === selectedDay);

  const moveMonth = (delta: number) => {
    setMonth(new Date(year, month.getMonth() + delta, 1));
    setSelectedDay(1);
  };

  // Week View Calculations
  const selectedDateObj = useMemo(() => {
    return new Date(year, month.getMonth(), Math.min(selectedDay, dayCount));
  }, [year, month, selectedDay, dayCount]);

  const weekDays = useMemo(() => {
    const dayOfWeek = selectedDateObj.getDay(); // 0 is Sunday
    const startOfWeek = new Date(selectedDateObj);
    startOfWeek.setDate(selectedDateObj.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [selectedDateObj]);

  const moveWeek = (deltaWeeks: number) => {
    const nextDate = new Date(selectedDateObj);
    nextDate.setDate(selectedDateObj.getDate() + deltaWeeks * 7);
    if (nextDate.getMonth() !== month.getMonth() || nextDate.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    }
    setSelectedDay(nextDate.getDate());
  };

  // Agenda View Calculations: Group all matching deliverables by date
  const agendaGrouped = useMemo(() => {
    const groups: {
      dateStr: string;
      dateObj: Date;
      day: number;
      events: CalendarEvent[];
    }[] = [];
    const map = new Map<string, CalendarEvent[]>();

    visible.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });

    const sortedDates = Array.from(map.keys()).sort();
    sortedDates.forEach((dateStr) => {
      const parts = dateStr.split("-").map(Number);
      const y = parts[0] ?? year;
      const m = (parts[1] ?? 1) - 1;
      const d = parts[2] ?? 1;
      const dateObj = new Date(y, m, d);
      groups.push({
        dateStr,
        dateObj,
        day: d,
        events: map.get(dateStr) || [],
      });
    });

    return groups;
  }, [visible, year]);

  // Monthly KPI Totals
  const monthlyMetrics = useMemo(() => {
    let reels = 0;
    let posts = 0;
    let stories = 0;
    let carousels = 0;
    let approved = 0;

    for (const ev of events) {
      const t = ev.type?.toLowerCase() || "";
      if (t.includes("reel") || t.includes("video")) reels++;
      else if (t.includes("story")) stories++;
      else if (t.includes("carousel")) carousels++;
      else posts++;

      if (ev.status === "approved") approved++;
    }

    const total = events.length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, reels, posts, stories, carousels, approved, approvalRate };
  }, [events]);

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => {
      if (ev.client_name) set.add(ev.client_name);
    });
    return Array.from(set).sort();
  }, [events]);

  const content = (
    <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto text-white">
      {/* Top Admin Actions */}
      <div className="grid grid-cols-2 sm:flex sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-2.5 w-full">
        <button
          onClick={() => {
            setSelectedSlotForEdit(null);
            setStoryModalOpen(true);
          }}
          className="w-full sm:w-auto justify-center min-h-10 sm:min-h-9 px-2.5 sm:px-3.5 rounded-xl border border-blue-500/30 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[11px] sm:text-xs font-bold inline-flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 text-center"
        >
          <Plus size={14} strokeWidth={2.5} className="shrink-0" />
          <span className="truncate sm:whitespace-nowrap">Schedule Story & Approval</span>
        </button>

        {canSchedulePublication && (
          <button
            onClick={() => {
              if (clientRoster.length > 0 && clientRoster[0]?.client_id) setNewClient(clientRoster[0].client_id);
              setIsScheduleOpen(true);
            }}
            className="w-full sm:w-auto justify-center min-h-10 sm:min-h-9 px-2.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] sm:text-xs font-bold inline-flex items-center gap-1 sm:gap-1.5 transition-all shadow-md cursor-pointer hover:shadow-blue-500/20 active:scale-95 text-center"
          >
            <Plus size={14} strokeWidth={2.5} className="shrink-0" />
            <span className="truncate sm:whitespace-nowrap">Schedule Publication</span>
          </button>
        )}
      </div>

      {/* Monthly Operational KPI Banner */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-[#97A0B3]">
            <span>Scheduled Total</span>
            <CalendarIcon className="size-4 text-[#7FA0D6]" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{monthlyMetrics.total}</div>
          <span className="text-[11px] text-[#7FA0D6] font-semibold mt-0.5">Across all clients</span>
        </div>

        <div className="bg-[#161F2D] border border-purple-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-purple-300">
            <span>Reels</span>
            <Video className="size-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{monthlyMetrics.reels}</div>
          <span className="text-[11px] text-purple-300/80 font-semibold mt-0.5">Short-form videos</span>
        </div>

        <div className="bg-[#161F2D] border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-[#7FA0D6]">
            <span>Posts / Posters</span>
            <ImageIcon className="size-4 text-[#7FA0D6]" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{monthlyMetrics.posts}</div>
          <span className="text-[11px] text-blue-300/80 font-semibold mt-0.5">Static graphics</span>
        </div>

        <div className="bg-[#161F2D] border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span>Stories & Carousels</span>
            <div className="flex items-center gap-1">
              <Sparkles className="size-3.5 text-amber-400" />
              <Layers className="size-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white">{monthlyMetrics.stories + monthlyMetrics.carousels}</div>
          <span className="text-[11px] text-amber-300/80 font-semibold mt-0.5">
            {monthlyMetrics.stories} stories · {monthlyMetrics.carousels} carousels
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#161F2D] border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
            <span>Approved Status</span>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{monthlyMetrics.approvalRate}%</div>
          <span className="text-[11px] text-emerald-300/80 font-semibold mt-0.5">
            {monthlyMetrics.approved} of {monthlyMetrics.total} ready
          </span>
        </div>
      </div>
      {/* Filter and Control Bar */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2.5 sm:gap-3">
        {/* Format Filter Pills (3 Options Fitting Screen, Removed 'All') */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
          <button
            type="button"
            onClick={() => setFormatFilter(formatFilter === "reel" ? "all" : "reel")}
            className={`w-full py-2 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer truncate ${
              formatFilter === "reel"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-purple-500/10 text-purple-300 hover:text-white border border-purple-500/20"
            }`}
          >
            <Video className="size-3.5 text-purple-400 shrink-0" />
            <span className="truncate">Reels ({monthlyMetrics.reels})</span>
          </button>

          <button
            type="button"
            onClick={() => setFormatFilter(formatFilter === "poster" ? "all" : "poster")}
            className={`w-full py-2 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer truncate ${
              formatFilter === "poster"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-500/10 text-[#7FA0D6] hover:text-white border border-blue-500/20"
            }`}
          >
            <ImageIcon className="size-3.5 text-[#7FA0D6]" />
            <span className="truncate">Posts ({monthlyMetrics.posts})</span>
          </button>

          <button
            type="button"
            onClick={() => setFormatFilter(formatFilter === "story" ? "all" : "story")}
            className={`w-full py-2 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer truncate ${
              formatFilter === "story"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-500/10 text-amber-300 hover:text-white border border-amber-500/20"
            }`}
          >
            <Sparkles className="size-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              <span className="hidden min-[420px]:inline">Stories &amp; Carousels</span>
              <span className="min-[420px]:hidden">Stories</span> ({monthlyMetrics.stories + monthlyMetrics.carousels})
            </span>
          </button>
        </div>

        {/* Dropdown Options and Search (Below the 3 format buttons) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full">
          <div className="grid grid-cols-2 sm:flex sm:flex-1 items-center gap-2 sm:gap-2.5">
            {/* Client Filter */}
            <div className="w-full sm:flex-1 sm:min-w-[140px]">
              <NativeSelect
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FA0D6]"
              >
                <option value="all">All Clients ({uniqueClients.length})</option>
                {uniqueClients.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:flex-1 sm:min-w-[130px]">
              <NativeSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FA0D6]"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="scheduled">Scheduled</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="draft">Draft</option>
              </NativeSelect>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-[220px] sm:shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#97A0B3]" />
            <input
              type="text"
              placeholder="Search topic or hook..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {calendarQuery.isPending && (
        <div className="p-4 rounded-xl bg-[#161F2D] border border-[#2A3446] text-xs text-[#7FA0D6] flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin" /> Loading content calendar from database...
        </div>
      )}
      {calendarQuery.isError && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 font-bold">
          {calendarQuery.error instanceof Error ? calendarQuery.error.message : "Unable to load calendar."}
        </div>
      )}

      {/* Bento Grid Layout & View Switcher */}
      <div className="flex flex-col gap-4">
        {/* View Switcher Bar & Controls */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
          {/* View Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#0B111C] border border-[#2A3446] rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setCalendarView("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calendarView === "month"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-[#97A0B3] hover:text-white"
              }`}
            >
              <CalendarIcon className="size-3.5" />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => setCalendarView("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calendarView === "week"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-[#97A0B3] hover:text-white"
              }`}
            >
              <CalendarDays className="size-3.5" />
              <span>Week</span>
            </button>
            <button
              type="button"
              onClick={() => setCalendarView("agenda")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calendarView === "agenda"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-[#97A0B3] hover:text-white"
              }`}
            >
              <List className="size-3.5" />
              <span>Agenda</span>
            </button>
          </div>

          {/* Month/Week Navigation */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            <span className="text-xs font-bold text-[#97A0B3] hidden md:inline-block">
              {visible.length} deliverables
            </span>

            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDay(now.getDate());
              }}
              className="px-3 py-1 text-xs font-bold text-slate-200 hover:text-white bg-[#0B111C] hover:bg-[#161F2D] rounded-xl border border-[#2A3446] transition-all cursor-pointer"
            >
              Today
            </button>

            <div className="flex items-center bg-[#0B111C] border border-[#2A3446] rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => (calendarView === "week" ? moveWeek(-1) : moveMonth(-1))}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                title={calendarView === "week" ? "Previous Week" : "Previous Month"}
              >
                <ChevronLeft className="size-4" strokeWidth={2.5} />
              </button>
              <div className="w-[1px] h-3.5 bg-[#2A3446] mx-0.5" />
              <button
                type="button"
                onClick={() => (calendarView === "week" ? moveWeek(1) : moveMonth(1))}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                title={calendarView === "week" ? "Next Week" : "Next Month"}
              >
                <ChevronRight className="size-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* ── VIEW 1: MONTH VIEW ── */}
        {calendarView === "month" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
            {/* Left 2 Cols: Compact Responsive Calendar Grid */}
            <div className="flex xl:col-span-2 bg-[#161F2D] border border-[#2A3446] rounded-2xl sm:rounded-[2rem] shadow-sm p-3.5 sm:p-6 lg:p-7 min-w-0 flex-col">
              {/* Calendar Title */}
              <div className="flex items-center justify-between mb-3 sm:mb-5">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                  {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </h2>
                <span className="text-[11px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/10 px-2.5 py-0.5 rounded-full border border-[#7FA0D6]/20">
                  {visible.length} in month
                </span>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-1.5 sm:mb-2.5">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                  <div
                    key={day}
                    className="py-1 text-center text-[9px] sm:text-xs font-black text-[#97A0B3] uppercase tracking-wider"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid Cells: Compact square on mobile, rich card on desktop */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr">
                {Array.from({ length: offset }, (_, index) => (
                  <div key={`empty-${index}`} className="rounded-xl bg-transparent p-1 sm:p-2 aspect-square sm:aspect-auto" />
                ))}

                {Array.from({ length: dayCount }, (_, index) => {
                  const day = index + 1;
                  const dayEvents = visible.filter((ev) => Number(ev.date.split("-")[2]) === day);
                  const isSelected = selectedDay === day;
                  const now = new Date();
                  const isToday =
                    now.getDate() === day && now.getMonth() === month.getMonth() && now.getFullYear() === month.getFullYear();

                  const dayCounts = dayEvents.reduce<Record<string, number>>((acc, ev) => {
                    const t = (ev.type || "").toLowerCase();
                    const key = t.includes("reel") || t.includes("video")
                      ? "reel"
                      : t.includes("story")
                      ? "story"
                      : t.includes("carousel")
                      ? "carousel"
                      : "poster";
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                  }, {});

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      aria-pressed={isSelected}
                      className={`relative rounded-xl p-1 sm:p-2 min-w-0 transition-all cursor-pointer min-h-[42px] sm:min-h-[105px] aspect-square sm:aspect-auto flex flex-col justify-between items-center sm:items-stretch border-2 group ${
                        isSelected
                          ? "border-blue-500 bg-[#7FA0D6]/20 ring-2 ring-blue-500/25 shadow-md z-10"
                          : isToday
                          ? "border-[#7FA0D6]/60 bg-[#161F2D] shadow-xs"
                          : "border-[#2A3446] hover:border-[#7FA0D6]/40 bg-[#0B111C]/40 hover:bg-[#161F2D]"
                      }`}
                    >
                      {/* Top row: day number & count */}
                      <div className="flex items-center justify-center sm:justify-between w-full">
                        <span
                          className={`text-xs sm:text-base font-black ${
                            isSelected
                              ? "text-white"
                              : isToday
                              ? "text-[#7FA0D6]"
                              : "text-slate-300 group-hover:text-white"
                          }`}
                        >
                          {day}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[9px] font-bold text-[#97A0B3] hidden sm:inline-block">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Mobile View: High-density color indicator dots (< sm) - fixed height so all boxes are identical size */}
                      <div className="flex sm:hidden items-center justify-center gap-0.5 h-2.5 w-full mt-auto">
                        {dayEvents.length > 0 ? (
                          <>
                            {Object.keys(dayCounts).slice(0, 3).map((fmtKey) => {
                              const cfg = FORMAT_CONFIG[fmtKey as keyof typeof FORMAT_CONFIG] || FORMAT_CONFIG.poster;
                              return (
                                <span
                                  key={fmtKey}
                                  className="size-1.5 rounded-full shrink-0 shadow-xs"
                                  style={{ backgroundColor: cfg.color }}
                                  title={cfg.label}
                                />
                              );
                            })}
                            {Object.keys(dayCounts).length > 3 && (
                              <span className="size-1 rounded-full bg-slate-400 shrink-0" />
                            )}
                          </>
                        ) : (
                          <span className="size-1.5 opacity-0 invisible" />
                        )}
                      </div>

                      {/* Desktop View: Full Chips with Format-Specific Icons (hidden sm:flex) */}
                      <div className="mt-auto hidden sm:flex flex-col gap-1 w-full text-left overflow-hidden">
                        {Object.entries(dayCounts).map(([fmtKey, count]) => {
                          const cfg = FORMAT_CONFIG[fmtKey as keyof typeof FORMAT_CONFIG] || FORMAT_CONFIG.poster;
                          const IconComponent = cfg.icon;
                          return (
                            <div
                              key={fmtKey}
                              className={`flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded-md border text-[8px] sm:text-[9.5px] font-bold leading-tight truncate ${cfg.chipBg} ${cfg.chipText} ${cfg.border}`}
                              title={`${count} ${cfg.label}${count > 1 ? "s" : ""}`}
                            >
                              <IconComponent className="size-2.5 sm:size-3 shrink-0" />
                              <span className="truncate">
                                {count} {cfg.label}
                                {count > 1 ? "s" : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Selected Day Event Rundown with Fixed Scroll Container */}
            <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl sm:rounded-[2rem] shadow-sm p-4 sm:p-6 flex flex-col max-h-[580px] overflow-hidden">
              <div className="flex items-start justify-between pb-3 mb-3 border-b border-[#2A3446]/60 shrink-0">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-base sm:text-[17px] font-black text-white tracking-tight flex items-center gap-1.5">
                    Events for {selectedDay}
                    {[1, 21, 31].includes(selectedDay)
                      ? "st"
                      : [2, 22].includes(selectedDay)
                      ? "nd"
                      : [3, 23].includes(selectedDay)
                      ? "rd"
                      : "th"}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#97A0B3] font-medium">
                    {new Date(year, month.getMonth(), selectedDay).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-blue-500/15 text-[#7FA0D6] border border-blue-500/30">
                  {selectedDayEvents.length} Item{selectedDayEvents.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Scrollable Events List in Fixed Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-[#2A3446] hover:scrollbar-thumb-[#7FA0D6]/40">
                {selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[220px] p-6 text-[#97A0B3] text-xs sm:text-sm font-bold bg-[#0B111C]/60 rounded-2xl border-2 border-dashed border-[#2A3446] text-center">
                    <CalendarIcon className="size-7 text-[#2A3446] mb-2.5" />
                    No events scheduled for this day.
                    {canSchedulePublication && (
                      <button
                        type="button"
                        onClick={() => {
                          const mm = String(monthNumber).padStart(2, "0");
                          const dd = String(selectedDay).padStart(2, "0");
                          setNewDate(`${year}-${mm}-${dd}`);
                          setIsScheduleOpen(true);
                        }}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus size={13} /> Schedule for Day {selectedDay}
                      </button>
                    )}
                  </div>
                ) : (
                  selectedDayEvents.map((event) => {
                    const cfg = getFormatConfig(event.type);
                    const IconComponent = cfg.icon;
                    const isApproved = event.status === "approved";

                    return (
                      <div
                        key={event.id}
                        className="group relative bg-[#0B111C] hover:bg-[#111A28] border border-[#2A3446] hover:border-[#7FA0D6]/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all overflow-hidden flex flex-col gap-2 shadow-xs"
                      >
                        {/* Top Row: Format Badge with Icon + Status */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black border uppercase tracking-wider ${cfg.badgeBg} ${cfg.badgeText} ${cfg.border}`}
                          >
                            <IconComponent className="size-3" />
                            {cfg.label}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="size-3" /> Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                <Clock className="size-3" /> Scheduled
                              </span>
                            )}
                            <span className="text-[10px] sm:text-[11px] font-bold text-[#7FA0D6] flex items-center gap-1">
                              <Clock className="size-3 text-[#97A0B3]" />
                              {event.time}
                            </span>
                          </div>
                        </div>

                        {/* Title / Topic */}
                        <h4 className="text-xs sm:text-[13px] font-bold text-white leading-snug group-hover:text-[#7FA0D6] transition-colors line-clamp-2">
                          {event.title}
                        </h4>

                        {/* Creative Hook snippet if present */}
                        {(event.selected_hook?.text || event.blueprint?.hooks?.[0]?.text) && (
                          <div className="text-[10.5px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg line-clamp-2">
                            <span className="font-bold text-amber-400">Hook: </span>
                            {event.selected_hook?.text || event.blueprint?.hooks?.[0]?.text}
                          </div>
                        )}

                        {/* Client info & Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-[#2A3446]/60 mt-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="size-5 sm:size-6 rounded-full flex items-center justify-center text-[8.5px] sm:text-[9px] font-black text-white bg-blue-600 shrink-0">
                              {event.client_name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 truncate max-w-[130px] sm:max-w-[180px]">
                              {event.client_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-auto">
                            {!isApproved && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateEventMutation.mutate({ id: event.id, status: "approved" });
                                }}
                                disabled={updateEventMutation.isPending}
                                className="px-2 py-1 rounded-lg text-[9.5px] sm:text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <Check size={10} /> Approve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setInspectEvent(event)}
                              className="px-2 py-1 rounded-lg text-[9.5px] sm:text-[10px] font-bold bg-[#161F2D] hover:bg-[#2A3446] text-[#7FA0D6] border border-[#2A3446] transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye size={10} /> Details
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSlotForEdit(event);
                                setStoryModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg text-[9.5px] sm:text-[10px] font-bold bg-[#161F2D] hover:bg-[#2A3446] text-[#BCCCE6] border border-[#2A3446] transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Story & Approval"
                            >
                              <Edit3 size={10} /> Story
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 2: WEEK VIEW (Sleek 7-Day Bar & Focus Day Rundown) ── */}
        {calendarView === "week" && (() => {
          const firstDay = weekDays[0] ?? new Date();
          const lastDay = weekDays[6] ?? new Date();

          return (
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl sm:rounded-[2rem] shadow-sm p-4 sm:p-6 lg:p-7 flex flex-col gap-4">
            {/* Week Range Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2A3446]/60">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-[#7FA0D6]" />
                <h3 className="text-sm sm:text-base font-black text-white">
                  Week of {firstDay.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
                  {lastDay.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </h3>
              </div>
              <span className="text-xs font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-3 py-1 rounded-full border border-[#7FA0D6]/30">
                {visible.filter((ev) => {
                  const evDate = new Date(ev.date);
                  return evDate >= firstDay && evDate <= lastDay;
                }).length}{" "}
                Deliverables This Week
              </span>
            </div>

            {/* 7-Day Horizontal Strip */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
              {weekDays.map((d) => {
                const dayNum = d.getDate();
                const now = new Date();
                const isToday =
                  now.getDate() === dayNum && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear();
                const isSelected = selectedDay === dayNum && month.getMonth() === d.getMonth();
                const dateIsoStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const count = visible.filter((ev) => ev.date === dateIsoStr).length;

                return (
                  <button
                    key={dateIsoStr}
                    type="button"
                    onClick={() => {
                      if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) {
                        setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      }
                      setSelectedDay(dayNum);
                    }}
                    className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/25 scale-[1.03]"
                        : isToday
                        ? "bg-[#0B111C] border-[#7FA0D6] text-white"
                        : "bg-[#0B111C]/60 hover:bg-[#0B111C] border-[#2A3446] text-slate-300"
                    }`}
                  >
                    <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider opacity-80">
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className="text-sm sm:text-xl font-black mt-0.5">{dayNum}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full mt-1 ${
                        count > 0
                          ? isSelected
                            ? "bg-white/20 text-white"
                            : "bg-[#7FA0D6]/20 text-[#7FA0D6]"
                          : "opacity-40"
                      }`}
                    >
                      {count > 0 ? `${count}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Events for the Active Week Day */}
            <div className="mt-2 bg-[#0B111C] rounded-2xl border border-[#2A3446] p-4 sm:p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2A3446]">
                <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>
                    Deliverables on{" "}
                    {new Date(year, month.getMonth(), selectedDay).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </h4>
                <span className="text-xs font-bold text-[#97A0B3]">
                  {selectedDayEvents.length} Item{selectedDayEvents.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="max-h-[440px] overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-[#2A3446]">
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#97A0B3]">
                    No deliverables scheduled for this day.
                  </div>
                ) : (
                  selectedDayEvents.map((event) => {
                    const cfg = getFormatConfig(event.type);
                    const IconComponent = cfg.icon;
                    const isApproved = event.status === "approved";
                    return (
                      <div
                        key={event.id}
                        className="p-3 sm:p-4 rounded-xl bg-[#161F2D] border border-[#2A3446] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${cfg.badgeBg} ${cfg.badgeText}`}>
                            <IconComponent className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-black text-white">{event.title}</span>
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.border}`}
                              >
                                {cfg.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#97A0B3] mt-0.5">
                              {event.client_name} · {event.time} · {isApproved ? "Approved" : "Scheduled"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => updateEventMutation.mutate({ id: event.id, status: "approved" })}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setInspectEvent(event)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0B111C] text-[#7FA0D6] border border-[#2A3446] cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSlotForEdit(event);
                              setStoryModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0B111C] text-[#BCCCE6] border border-[#2A3446] cursor-pointer"
                          >
                            Story
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          );
        })()}

        {/* ── VIEW 3: AGENDA / SCHEDULE FEED VIEW ── */}
        {calendarView === "agenda" && (
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl sm:rounded-[2rem] shadow-sm p-4 sm:p-6 lg:p-7 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2A3446]">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Chronological Agenda · {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </h3>
                <p className="text-xs text-[#97A0B3]">All scheduled creative posts and pipeline deliverables</p>
              </div>
              <span className="text-xs font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-3 py-1 rounded-full border border-[#7FA0D6]/30">
                {visible.length} Total Deliverables
              </span>
            </div>

            {/* Scrollable Container with Fixed Height */}
            <div className="max-h-[580px] overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-[#2A3446]">
              {agendaGrouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#97A0B3] text-sm bg-[#0B111C]/60 rounded-2xl border-2 border-dashed border-[#2A3446] text-center">
                  <CalendarIcon className="size-8 text-[#2A3446] mb-2" />
                  No deliverables scheduled for this month matching active filters.
                  {canSchedulePublication && (
                    <button
                      type="button"
                      onClick={() => setIsScheduleOpen(true)}
                      className="mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Schedule New Publication
                    </button>
                  )}
                </div>
              ) : (
                agendaGrouped.map((group) => {
                  const now = new Date();
                  const isToday =
                    now.getDate() === group.day &&
                    now.getMonth() === group.dateObj.getMonth() &&
                    now.getFullYear() === group.dateObj.getFullYear();

                  return (
                    <div key={group.dateStr} className="space-y-2">
                      {/* Date Group Header */}
                      <div className="sticky top-0 z-10 flex items-center justify-between py-1.5 px-3 rounded-xl bg-[#0B111C]/95 backdrop-blur-md border border-[#2A3446]">
                        <span className="text-xs font-black text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isToday ? "bg-blue-500 animate-pulse" : "bg-[#7FA0D6]"}`} />
                          {group.dateObj.toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {isToday && (
                            <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase">
                              Today
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] font-bold text-[#97A0B3]">
                          {group.events.length} item{group.events.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Items for this date */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {group.events.map((event) => {
                          const cfg = getFormatConfig(event.type);
                          const IconComponent = cfg.icon;
                          const isApproved = event.status === "approved";

                          return (
                            <div
                              key={event.id}
                              className="bg-[#0B111C] hover:bg-[#111A28] border border-[#2A3446] hover:border-[#7FA0D6]/40 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition-all shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-black border uppercase tracking-wider ${cfg.badgeBg} ${cfg.badgeText} ${cfg.border}`}
                                >
                                  <IconComponent className="size-3" />
                                  {cfg.label}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {isApproved ? (
                                    <span className="text-[9.5px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      Approved
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                      Scheduled
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold text-[#97A0B3]">{event.time}</span>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs sm:text-[13px] font-black text-white line-clamp-2">
                                  {event.title}
                                </h4>
                                <p className="text-[10.5px] text-[#97A0B3] mt-0.5 truncate">{event.client_name}</p>
                              </div>

                              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#2A3446]/50">
                                {!isApproved && (
                                  <button
                                    type="button"
                                    onClick={() => updateEventMutation.mutate({ id: event.id, status: "approved" })}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setInspectEvent(event)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#161F2D] text-[#7FA0D6] border border-[#2A3446] cursor-pointer"
                                >
                                  Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSlotForEdit(event);
                                    setStoryModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#161F2D] text-[#BCCCE6] border border-[#2A3446] cursor-pointer"
                                >
                                  Story
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Schedule Publication (Admin Need) */}
      {isScheduleOpen && canSchedulePublication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A3446] mb-5">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <CalendarIcon className="size-5 text-[#7FA0D6]" />
                Schedule New Publication
              </h3>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold">
                {formError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newClient) {
                  setFormError("Please select a target client.");
                  return;
                }
                createEventMutation.mutate({
                  client_id: newClient,
                  publish_date: newDate,
                  scheduled_time: newDate && newTime ? `${newDate}T${newTime}:00Z` : undefined,
                  format_type: newFormat,
                  caption: newCaption || undefined,
                  status: newStatus,
                });
              }}
              className="space-y-4 text-xs"
            >
              {/* Client Select */}
              <div>
                <label className="block text-[#97A0B3] font-bold mb-1.5">Client Profile</label>
                <NativeSelect
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
                  required
                >
                  <option value="">Select a client...</option>
                  {clientRoster.map((c) => (
                    <option key={c.client_id} value={c.client_id}>
                      {c.company_name || c.email} ({c.plan_name || "Custom"})
                    </option>
                  ))}
                </NativeSelect>
              </div>

              {/* Format Type Selection Pills with Icons */}
              <div>
                <label className="block text-[#97A0B3] font-bold mb-1.5">Deliverable Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Reel", icon: Video, color: "border-purple-500/40 text-purple-300 bg-purple-500/15" },
                    { label: "Poster", icon: ImageIcon, color: "border-blue-500/40 text-[#7FA0D6] bg-blue-500/15" },
                    { label: "Story", icon: Sparkles, color: "border-amber-500/40 text-amber-300 bg-amber-500/15" },
                    { label: "Carousel", icon: Layers, color: "border-emerald-500/40 text-emerald-300 bg-emerald-500/15" },
                  ].map((fmt) => {
                    const IconComp = fmt.icon;
                    const isSelected = newFormat === fmt.label;
                    return (
                      <button
                        type="button"
                        key={fmt.label}
                        onClick={() => setNewFormat(fmt.label)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? `${fmt.color} ring-2 ring-blue-500/40 font-black`
                            : "bg-[#0B111C] border-[#2A3446] text-slate-400 hover:text-white"
                        }`}
                      >
                        <IconComp className="size-4 mb-1" />
                        <span className="text-[11px]">{fmt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#97A0B3] font-bold mb-1.5">Publish Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#97A0B3] font-bold mb-1.5">Publish Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
                    required
                  />
                </div>
              </div>

              {/* Caption / Topic */}
              <div>
                <label className="block text-[#97A0B3] font-bold mb-1.5">Topic / Caption / Creative Concept</label>
                <textarea
                  rows={3}
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="e.g. Authority reel breaking down enterprise operational bottlenecks with actionable tips..."
                  className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]"
                />
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-[#97A0B3] font-bold mb-1.5">Initial Status</label>
                <NativeSelect
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="approved">Approved</option>
                  <option value="draft">Draft / Concept Pending</option>
                </NativeSelect>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:bg-[#161F2D] text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {createEventMutation.isPending && <RefreshCw size={13} className="animate-spin" />}
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Event Details & Admin Management (Admin Need) */}
      {inspectEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#2A3446] shrink-0">
              <div className="flex items-center gap-2">
                {(() => {
                  const cfg = getFormatConfig(inspectEvent.type);
                  const IconComp = cfg.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border uppercase tracking-wider ${cfg.badgeBg} ${cfg.badgeText} ${cfg.border}`}
                    >
                      <IconComp className="size-3.5" />
                      {cfg.label}
                    </span>
                  );
                })()}
                <h3 className="text-base font-black text-white truncate max-w-[260px]">
                  {inspectEvent.client_name}
                </h3>
              </div>

              <button
                onClick={() => setInspectEvent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 text-xs">
              {/* Media Preview if uploaded */}
              {inspectEvent.file_url ? (
                <div className="rounded-2xl overflow-hidden border border-[#2A3446] bg-[#0B111C] p-2 flex flex-col items-center">
                  {inspectEvent.file_type?.includes("video") || inspectEvent.type === "Reel" ? (
                    <video
                      controls
                      src={inspectEvent.file_url}
                      className="w-full max-h-[240px] rounded-xl object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={inspectEvent.file_url}
                      alt={inspectEvent.title}
                      className="w-full max-h-[240px] rounded-xl object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#0B111C]/60 border border-[#2A3446] text-[#97A0B3] flex items-center gap-2">
                  <Film className="size-4 text-[#7FA0D6]" />
                  <span>Media asset queued in production pipeline (not uploaded yet).</span>
                </div>
              )}

              {/* Date & Status Meta */}
              <div className="grid grid-cols-2 gap-3 bg-[#0B111C] p-3 rounded-2xl border border-[#2A3446]">
                <div>
                  <span className="text-[#97A0B3] font-bold block mb-0.5">Scheduled Publish</span>
                  <div className="text-white font-black text-xs flex items-center gap-1.5">
                    <CalendarIcon className="size-3.5 text-[#7FA0D6]" />
                    {inspectEvent.date} · {inspectEvent.time}
                  </div>
                </div>

                <div>
                  <span className="text-[#97A0B3] font-bold block mb-0.5">Delivery Status</span>
                  <div className="capitalize font-black text-xs flex items-center gap-1.5">
                    {inspectEvent.status === "approved" ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Approved
                      </span>
                    ) : (
                      <span className="text-blue-400 flex items-center gap-1">
                        <Clock className="size-3.5" /> {inspectEvent.status.replaceAll("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Title / Caption */}
              <div>
                <label className="text-[#97A0B3] font-bold block mb-1">Caption / Premise</label>
                <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-slate-200 leading-relaxed font-medium">
                  {inspectEvent.caption || inspectEvent.title}
                </div>
              </div>

              {/* Creative Blueprint & Hook details if present */}
              {(inspectEvent.selected_hook || inspectEvent.blueprint) && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Sparkles className="size-3" /> Creative Hook & Angle
                    </span>
                    {inspectEvent.selected_hook?.angle && (
                      <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md uppercase">
                        {inspectEvent.selected_hook.angle}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 font-medium">
                    "{inspectEvent.selected_hook?.text || inspectEvent.blueprint?.hooks?.[0]?.text}"
                  </p>
                  {inspectEvent.selected_hook?.rationale && (
                    <p className="text-[#97A0B3] text-[11px] italic">
                      Strategy: {inspectEvent.selected_hook.rationale}
                    </p>
                  )}
                </div>
              )}

              {/* Admin Actions Bar */}
              <div className="pt-2 border-t border-[#2A3446] space-y-3">
                <span className="text-[#97A0B3] font-bold block text-[11px]">Admin Status Controls</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => updateEventMutation.mutate({ id: inspectEvent.id, status: "approved" })}
                    disabled={updateEventMutation.isPending || inspectEvent.status === "approved"}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <CheckCircle2 size={13} /> Set Approved
                  </button>

                  <button
                    onClick={() => updateEventMutation.mutate({ id: inspectEvent.id, status: "scheduled" })}
                    disabled={updateEventMutation.isPending || inspectEvent.status === "scheduled"}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Clock size={13} /> Set Scheduled
                  </button>

                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Remove Publication Slot",
                        description: `Are you sure you want to remove "${inspectEvent.title || "this publication"}" from the calendar?`,
                        details: [
                          `Client: ${inspectEvent.client_name}`,
                          `Scheduled Date: ${inspectEvent.date} at ${inspectEvent.time}`,
                          "This removes the scheduled publication slot from the calendar pipeline.",
                        ],
                        confirmText: "Delete Slot",
                        cancelText: "Cancel",
                        tone: "danger",
                        icon: "trash",
                      });
                      if (ok) {
                        deleteEventMutation.mutate(inspectEvent.id);
                      }
                    }}
                    disabled={deleteEventMutation.isPending}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
                  >
                    <Trash2 size={13} /> Delete Slot
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Story & Approval Modal */}
      <StoryApprovalModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        onSuccess={() => void calendarQuery.refetch()}
        initialSlot={selectedSlotForEdit}
        defaultDate={`${year}-${String(monthNumber).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`}
      />
    </div>
  );

  if (embedded) {
    return <Container className="text-slate-100">{content}</Container>;
  }

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-slate-100 flex flex-col">
      <AdminTopHeader activeTab="Calendar" />
      <Container className="flex-1 p-3.5 sm:px-6 lg:px-8 sm:py-6">{content}</Container>
    </div>
  );
}

export default AdminCalendarPage;
