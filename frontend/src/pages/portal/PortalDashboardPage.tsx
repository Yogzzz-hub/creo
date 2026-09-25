import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { PlanBargainCallModal } from "../../components/portal/PlanBargainCallModal";

export interface TeamHandler {
  id: string;
  name: string;
  email: string;
  raw_role: string;
  role: string;
  is_primary?: boolean;
  pod_name?: string;
}

interface DashboardData {
  pending_deliverable_count: number;
  open_ticket_count: number;
  ai_summary_line: string | null;
  onboarding_stage: number;
  brand_summary: string | null;
  account_status?: string;
  active_plan?: {
    status: string;
    name?: string;
    price_minor?: number;
    monthly_price?: number;
    current_period_end?: string | null;
  } | null;
  company?: { name?: string } | null;
  created_at?: string | null;
  assigned_team?: TeamHandler[];
}

interface CalendarEntry {
  id: string;
  title?: string;
  date: string;
  scheduled_at?: string;
  status: string;
  file_url?: string;
  type?: string;
  file_type?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at?: string | null;
}

interface NotificationPayload {
  unread_count: number;
  items: NotificationItem[];
}

function getRelativeTime(isoString?: string | null) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function PortalDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bargainModalOpen, setBargainModalOpen] = useState(false);
  const [activeCalendarFilter, setActiveCalendarFilter] = useState("All");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const { data: notifData } = useQuery<NotificationPayload>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      return await request<NotificationPayload>("/api/v1/notifications");
    },
    enabled: !!user?.id,
    refetchInterval: 8000,
  });

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["portal-dashboard", user?.id],
    queryFn: async () => {
      return await request<DashboardData>("/api/v1/portal/dashboard");
    },
    refetchInterval: 15000,
  });

  const subscriptionActive = !!dashboard?.active_plan && ["active", "trialing"].includes(dashboard?.active_plan?.status);

  // Real deliverables query for dashboard
  const { data: deliverablesData } = useQuery<{ items: any[]; waiting_on_you: number }>({
    queryKey: ["portal-dashboard-deliverables", user?.id],
    queryFn: async () => {
      try {
        return await request<any>("/api/v1/portal/deliverables?limit=6");
      } catch {
        return { items: [], waiting_on_you: 0 };
      }
    },
    enabled: subscriptionActive,
    refetchInterval: 15000,
  });

  // Real tickets query for dashboard
  const { data: ticketsData = [] } = useQuery<any[]>({
    queryKey: ["portal-dashboard-tickets", user?.id],
    queryFn: async () => {
      try {
        const res = await request<any[]>("/api/v1/tickets");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: subscriptionActive,
    refetchInterval: 12000,
  });

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
    enabled: subscriptionActive,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApproveDeliverable = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await request(`/api/v1/deliverables/${id}/approve`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard-deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      showToast("Deliverable approved!");
    } catch {
      showToast("Approval failed or already processed");
    }
  };

  const handleDeclineDeliverable = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await request(`/api/v1/deliverables/${id}/request-changes?rejection_comment=Changes requested from dashboard`, {
        method: "POST",
      });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard-deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      showToast("Revision requested from pod");
    } catch {
      showToast("Change request failed");
    }
  };

  const pendingDeliverables = (deliverablesData?.items || []).filter(
    (d: any) => d.status === "pending_approval" || d.status === "in_production"
  );

  const ticketCount = dashboard?.open_ticket_count ?? ticketsData.filter(t => t.status === "open" || t.status === "in_progress").length;

  const rawNotifications = notifData?.items || [];
  const notifications = rawNotifications.map((n) => ({
    ...n,
    is_read: n.is_read || readIds.has(n.id),
  }));
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => new Set([...prev, ...allIds]));
    try {
      await request("/api/v1/notifications/mark-all-read", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    } catch {
      // ignore
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    setReadIds((prev) => new Set([...prev, item.id]));
    if (!item.is_read) {
      try {
        await request(`/api/v1/notifications/${item.id}/read`, { method: "PATCH" });
        queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      } catch {
        // ignore
      }
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const lead = dashboard?.assigned_team?.find(t => t.is_primary) || dashboard?.assigned_team?.[0];

  return (
    <div className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8">
      <PlanBargainCallModal isOpen={bargainModalOpen} onClose={() => setBargainModalOpen(false)} />
      <main className="max-w-[1440px] mx-auto space-y-6">

{/* ── 1. Content Calendar Section (Detailed) ── */}
<section className="card-surface card-interactive p-6 sm:p-8 flex flex-col justify-between" data-purpose="content-calendar-card">
  {/* Calendar Header & Filter Tabs */}
  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-6">
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/50 shadow-sm">
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Content Calendar</h2>
          <span className="hidden sm:inline-flex rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse"></span>
            Instagram Hub
          </span>
        </div>
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium">
          Multi-asset publishing queue for @{((dashboard?.company?.name || user?.company_name || user?.full_name || "brand").toLowerCase().replace(/[^a-z0-9]/g, ''))}
        </p>
      </div>
    </div>
    {/* Filter Pills */}
    <div className="inline-flex flex-wrap sm:flex-nowrap items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100/80 text-[11px] sm:text-xs font-bold gap-1 self-stretch xl:self-auto w-full xl:w-auto">
      {["All", "Reels", "Posts", "Stories"].map((filterName) => (
        <button
          key={filterName}
          onClick={() => setActiveCalendarFilter(filterName)}
          className={`px-3 sm:px-4 py-2 rounded-lg flex-1 sm:flex-none text-center transition-all ${
            activeCalendarFilter === filterName
              ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/60 border border-transparent"
          }`}
        >
          {filterName === "All" ? "All Instagram" : filterName}
        </button>
      ))}
    </div>
  </div>

  {/* Calendar Cards (Mobile Responsive) */}
  <div className="flex flex-col gap-3">
    {!subscriptionActive ? (
      <div className="py-12 text-center bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <h3 className="text-sm font-black text-slate-800 mb-1">Calendar Inactive</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Multi-channel publishing schedule and asset queuing will activate upon retainer onboarding.
        </p>
      </div>
    ) : rawEntries.filter(e => activeCalendarFilter === "All" || (e.type || "").toLowerCase() === activeCalendarFilter.toLowerCase() || (activeCalendarFilter === "Reels" && (e.type || "").toLowerCase() === "reel") || (activeCalendarFilter === "Posts" && (e.type || "").toLowerCase() === "post") || (activeCalendarFilter === "Stories" && (e.type || "").toLowerCase() === "story")).length === 0 ? (
      <div className="py-12 text-center bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl flex flex-col items-center justify-center">
        <svg className="w-8 h-8 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        <p className="text-sm font-semibold text-slate-500">No matching calendar entries.</p>
        <p className="text-xs text-slate-400 mt-1">Try selecting a different filter.</p>
      </div>
    ) : rawEntries.filter(e => activeCalendarFilter === "All" || (e.type || "").toLowerCase() === activeCalendarFilter.toLowerCase() || (activeCalendarFilter === "Reels" && (e.type || "").toLowerCase() === "reel") || (activeCalendarFilter === "Posts" && (e.type || "").toLowerCase() === "post") || (activeCalendarFilter === "Stories" && (e.type || "").toLowerCase() === "story")).slice(0, 4).map((entry, i) => (
      <Link key={entry.id || i} to="/portal/calendar" className="group flex flex-col xl:flex-row xl:items-center justify-between bg-white border border-slate-100/80 rounded-2xl p-4 gap-4 hover:shadow-lg hover:shadow-blue-900/5 hover:border-blue-200/80 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-50 to-fuchsia-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/50 shadow-sm group-hover:scale-105 group-hover:shadow transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
          </div>
          <div className="min-w-0 flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2 mb-1 w-full">
              <h3 className="text-sm sm:text-[15px] font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-full" title={entry.title || "Untitled Deliverable"}>{entry.title || "Untitled Deliverable"}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-500">
              <span className="shrink-0 bg-slate-100 text-slate-500 text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">{entry.type || "Content"}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
              <span className="flex items-center gap-1 shrink-0"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>{new Date(entry.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
              <span className="flex items-center gap-1 shrink-0"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>{entry.scheduled_at || "TBD"}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 mt-2 xl:mt-0 pt-3 xl:pt-0 border-t xl:border-0 border-slate-100 shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-black border border-white ring-2 ring-white shadow-xs">
              {lead?.name ? lead.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() : "PL"}
            </div>
            <span className="truncate max-w-[100px]">{lead?.name || "Pod Lead"}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>{entry.status}
            </span>
            
            {entry.file_url ? (
              <a 
                href={entry.file_url} 
                target="_blank" 
                rel="noreferrer"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center border border-slate-200/80 hover:border-blue-200 transition-all shadow-xs shrink-0"
                onClick={(e) => e.stopPropagation()}
                title="View Asset"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </a>
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center border border-slate-100 shrink-0" title="Processing">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            )}
          </div>
        </div>
      </Link>
    ))}
  </div>
  
  <div className="flex items-center justify-between pt-5 border-t border-slate-100/90 mt-5">
    <span className="text-[11px] sm:text-xs font-semibold text-slate-400">
      {subscriptionActive 
        ? `Showing ${Math.min(rawEntries.filter(e => activeCalendarFilter === "All" || (e.type || "").toLowerCase() === activeCalendarFilter.toLowerCase() || (activeCalendarFilter === "Reels" && (e.type || "").toLowerCase() === "reel") || (activeCalendarFilter === "Posts" && (e.type || "").toLowerCase() === "post") || (activeCalendarFilter === "Stories" && (e.type || "").toLowerCase() === "story")).length, 4)} of ${rawEntries.filter(e => activeCalendarFilter === "All" || (e.type || "").toLowerCase() === activeCalendarFilter.toLowerCase() || (activeCalendarFilter === "Reels" && (e.type || "").toLowerCase() === "reel") || (activeCalendarFilter === "Posts" && (e.type || "").toLowerCase() === "post") || (activeCalendarFilter === "Stories" && (e.type || "").toLowerCase() === "story")).length} matching items`
        : "0 scheduled items"}
    </span>
    <Link to="/portal/calendar" className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer group">
      View Full Calendar
      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
      </svg>
    </Link>
  </div>
</section>

{/* ── 2. Deliverables & Approvals Section (Detailed) ── */}
<section className="card-surface card-interactive p-6 sm:p-8 flex flex-col justify-between" data-purpose="deliverables-section">
  <div>
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/50 shadow-sm">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Deliverables &amp; Approvals</h2>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold inline-flex items-center justify-center uppercase tracking-wider ${
              !subscriptionActive
                ? "bg-slate-100 text-slate-600 border border-slate-200 shadow-xs"
                : pendingDeliverables.length > 0
                ? "bg-amber-50 text-amber-700 border border-amber-200/60 shadow-xs"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                !subscriptionActive
                  ? "bg-slate-400"
                  : pendingDeliverables.length > 0
                  ? "bg-amber-500 animate-pulse"
                  : "bg-emerald-500"
              }`}></span>
              {!subscriptionActive ? "LOCKED" : pendingDeliverables.length > 0 ? `${pendingDeliverables.length} Pending` : "Up to date"}
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium">
            Review, download, approve or request revisions from your creative squad in real-time.
          </p>
        </div>
      </div>
      <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 self-start sm:self-auto">
        {subscriptionActive ? "Current Production Sprint" : "Retainer Required"}
      </span>
    </div>
    
    {!subscriptionActive ? (
      /* Deliverables Locked Container */
      <div className="border border-slate-200/80 bg-slate-50/60 rounded-2xl p-8 text-center flex flex-col items-center justify-center my-2">
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-blue-600 mb-4">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-base font-black text-slate-900 mb-1.5">Deliverables Workspace Locked</h3>
        <p className="text-xs sm:text-[13px] text-slate-500 max-w-sm leading-relaxed mb-6">
          Access to static posters, reels, and approval stages requires an active production retainer. Choose a plan to assign your dedicated creative squad.
        </p>
        <Link
          to="/portal/payments"
          className="bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
        >
          <span>Choose Retainer Plan</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    ) : pendingDeliverables.length === 0 ? (
      <div className="py-12 text-center bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 my-2">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-sm font-black text-slate-800 mb-1">No Deliverables Pending Review</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Your creative pod is executing current sprint items. Newly produced assets will appear here for your approval.
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pendingDeliverables.slice(0, 4).map((item: any) => (
          <div key={item.id} className="bg-white border border-slate-100/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-5 hover:shadow-md hover:border-blue-200/80 hover:-translate-y-0.5 transition-all duration-300 group/item">
            {/* Thumbnail */}
            <div className="w-full sm:w-36 h-28 bg-[#EEF4FF] border border-[#DCE9FE] rounded-xl flex flex-col items-center justify-center relative shrink-0 group-hover/item:shadow-inner overflow-hidden">
              {item.thumbnail_url || item.file_url ? (
                <img src={item.thumbnail_url || item.file_url} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <>
                  <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0052FF 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
                  <div className="w-10 h-10 rounded-full bg-white text-blue-600 shadow-md flex items-center justify-center group-hover/item:scale-110 transition-transform z-10">
                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
                    </svg>
                  </div>
                </>
              )}
              <span className="absolute bottom-2 right-2 bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm z-10 tracking-wider">
                {item.asset_type?.toUpperCase() || "ASSET"}
              </span>
            </div>
            {/* Content & Actions */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">
                    {item.asset_type || "Production Asset"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {item.created_at ? getRelativeTime(item.created_at) : "Recent"}
                  </span>
                </div>
                <h4 className="text-sm sm:text-[15px] font-black text-slate-900 group-hover/item:text-blue-600 transition-colors truncate">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed font-medium">
                  {item.description || "Review creative asset and provide feedback or approve for publication."}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 mt-1">
                <button
                  onClick={(e) => handleApproveDeliverable(item.id, e)}
                  className="bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                  <span>Approve</span>
                </button>
                <button
                  onClick={(e) => handleDeclineDeliverable(item.id, e)}
                  className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                  <span>Request Revision</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
  
  {/* Deliverables Footer */}
  <div className="flex items-center justify-between pt-5 border-t border-slate-100/90 mt-6 text-xs">
    <div className="flex items-center gap-2 text-slate-500 font-medium">
      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span className="hidden sm:inline">
        {subscriptionActive ? "Approvals deploy directly to the scheduled Instagram buffer" : "Production workspace unlocks upon onboarding"}
      </span>
      <span className="sm:hidden">
        {subscriptionActive ? "Auto-deploys to Instagram" : "Locked"}
      </span>
    </div>
    <Link to="/portal/deliverables" className="font-black text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer group whitespace-nowrap">
      <span>{subscriptionActive ? "Full Deliverables Archive" : "View Deliverables"}</span>
      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path>
      </svg>
    </Link>
  </div>
</section>

{/* ── 3. Creative Pod, Notifications, Support, SLA (Compact / Less Details) ── */}
<section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-purpose="secondary-metrics-grid">
  
  {/* Card 1: Creative Pod */}
  <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-lg hover:border-blue-100/60 transition-all duration-300" data-purpose="creative-pod-card">
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Creative Pod</h2>
            <p className="text-[11px] text-slate-500 font-semibold">{lead?.name ? "Pod Alpha" : "Pod Standby"}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
          subscriptionActive
            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
            : "bg-slate-100 text-slate-600 border border-slate-200"
        }`}>
          {subscriptionActive ? "Assigned" : "Standby"}
        </span>
      </div>

      <div className="my-4 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center gap-3">
        <div className="flex -space-x-2 overflow-hidden shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white ring-1 ring-slate-100">
            {lead?.name ? lead.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() : "PL"}
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white ring-1 ring-slate-100">
            VE
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white ring-1 ring-slate-100">
            GD
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">{lead?.name || "Senior Creative Lead"}</p>
          <p className="text-[10px] text-slate-500 font-medium truncate">Lead &amp; Creative Specialists</p>
        </div>
      </div>
    </div>

    <Link to="/portal/creative-pod" className="mt-2 w-full py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-100">
      <span>Manage Pod</span>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
    </Link>
  </div>

  {/* Card 2: Notifications */}
  <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-lg hover:border-blue-100/60 transition-all duration-300" data-purpose="notifications-card">
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Notifications</h2>
            <p className="text-[11px] text-slate-500 font-semibold">{unreadCount} unread update{unreadCount === 1 ? "" : "s"}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="my-4">
        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.slice(0, 1).map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 cursor-pointer transition-colors"
              >
                <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-slate-400 font-semibold">
            All caught up!
          </div>
        )}
      </div>
    </div>

    <div className="flex items-center gap-2 mt-2">
      {unreadCount > 0 && (
        <button
          onClick={handleMarkAllRead}
          className="flex-1 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors text-center border border-slate-100 cursor-pointer"
        >
          Mark Read
        </button>
      )}
      <Link
        to="/portal/support"
        className="flex-1 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-slate-100 cursor-pointer"
      >
        <span>View Updates</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
      </Link>
    </div>
  </div>

  {/* Card 3: Support Tickets */}
  <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-lg hover:border-blue-100/60 transition-all duration-300" data-purpose="support-tickets-card">
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-15.536a5 5 0 017.072 0m0 0l-2.828 2.829"></path></svg>
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Support Tickets</h2>
            <p className="text-[11px] text-slate-500 font-semibold">{ticketCount} Active Request{ticketCount === 1 ? "" : "s"}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
          ticketCount > 0
            ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
        }`}>
          {ticketCount > 0 ? `${ticketCount} Open` : "Nominal"}
        </span>
      </div>

      <div className="my-4 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Queue Priority</p>
          <p className="text-xs font-bold text-slate-800">{subscriptionActive ? "Priority Tier-3 SLA" : "Standard Queue"}</p>
        </div>
        <span className="text-lg font-black text-slate-900">{ticketCount}</span>
      </div>
    </div>

    <Link to="/portal/support" className="mt-2 w-full py-2.5 rounded-xl bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-black transition-all shadow-md shadow-blue-600/15 flex items-center justify-center gap-1.5 active:scale-95">
      <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
      <span>Raise a Ticket</span>
    </Link>
  </div>

  {/* Card 4: SLA Performance */}
  <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-lg hover:border-blue-100/60 transition-all duration-300" data-purpose="sla-performance-card">
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">SLA Performance</h2>
            <p className="text-[11px] text-slate-500 font-semibold">{subscriptionActive ? "2-Hour Guarantee" : "Standard SLA"}</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
          99.8%
        </span>
      </div>

      <div className="my-4 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Avg Turnaround</p>
          <p className="text-xs font-bold text-slate-800">{subscriptionActive ? "< 1.4 Hours" : "< 24 Hours"}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Resolution</p>
          <p className="text-xs font-bold text-emerald-600">On Target</p>
        </div>
      </div>
    </div>

    <Link to="/portal/support" className="mt-2 w-full py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-100">
      <span>View SLA Guarantee</span>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
    </Link>
  </div>
</section>

{/* ── 4. Brand Accelerator & Profile (Compact / Less Details) ── */}
<section className="grid grid-cols-1 lg:grid-cols-12 gap-6" data-purpose="bottom-overview-grid">
  
  {/* Brand Accelerator / Retainer Card (Left 8 cols) */}
  <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 sm:p-7 flex flex-col justify-between hover:shadow-lg hover:border-blue-100/60 transition-all duration-300" data-purpose="active-retainer-card">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {dashboard?.active_plan?.name || "Growth Accelerator"}
          </h2>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            subscriptionActive
              ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-xs"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}>
            {subscriptionActive ? "Active Retainer" : "Retainer Required"}
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium max-w-md">
          Comprehensive brand scaling pipeline with dedicated creative squad and priority turnaround.
        </p>
      </div>
      <div className="text-left sm:text-right">
        <div className="text-2xl font-black text-slate-900">
          ₹{dashboard?.active_plan?.monthly_price ? Number(dashboard.active_plan.monthly_price).toLocaleString("en-IN") : "90,000"}
          <span className="text-xs text-slate-500 font-medium">/mo</span>
        </div>
        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
          {dashboard?.active_plan?.current_period_end 
            ? `Renews ${new Date(dashboard.active_plan.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : "Monthly Retainer"}
        </p>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100/90 mt-4 gap-3">
      <button
        onClick={() => setBargainModalOpen(true)}
        className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
        <span>Request Tier Adjustment</span>
      </button>
      <Link
        to="/portal/payments"
        className="py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-colors flex items-center gap-2 border border-slate-100"
      >
        <span>Manage Subscription Details</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
      </Link>
    </div>
  </div>

  {/* Client Profile Card (Right 4 cols) */}
  <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 sm:p-7 flex flex-col justify-between hover:shadow-lg hover:border-blue-100/60 transition-all duration-300" data-purpose="user-profile-card">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-blue-500/20 shrink-0 border-2 border-white relative">
        {(dashboard?.company?.name?.[0] || user?.company_name?.[0] || user?.full_name?.[0] || "C").toUpperCase()}
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-black text-slate-900 tracking-tight truncate">
          {user?.full_name || "Client"}
        </h2>
        <p className="text-xs text-slate-500 font-medium truncate">{user?.email}</p>
        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block mt-1 truncate">
          {dashboard?.company?.name || user?.company_name || "Workspace"}
        </span>
      </div>
    </div>

    <div className="pt-4 border-t border-slate-100/90 mt-auto">
      <Link
        to="/portal/account"
        className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-100"
      >
        <span>View Profile Settings</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
      </Link>
    </div>
  </div>
</section>

</main>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400"></span>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
