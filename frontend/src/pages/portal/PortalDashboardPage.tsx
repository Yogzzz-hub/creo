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
  terms_accepted?: boolean;
  active_plan?: { status: string; name?: string; price_minor?: number } | null;
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

function getNotifIcon(title: string, link?: string | null) {
  const t = (title + " " + (link || "")).toLowerCase();
  if (t.includes("deliverable") || t.includes("reel") || t.includes("motion") || t.includes("video")) {
    return {
      bg: "bg-blue-50 text-blue-600 border border-blue-100",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    };
  }
  if (t.includes("sync") || t.includes("calendar") || t.includes("schedule") || t.includes("meet")) {
    return {
      bg: "bg-indigo-50 text-indigo-600 border border-indigo-100",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
        </svg>
      ),
    };
  }
  if (t.includes("invoice") || t.includes("payment") || t.includes("retainer") || t.includes("billing")) {
    return {
      bg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    };
  }
  if (t.includes("ticket") || t.includes("support")) {
    return {
      bg: "bg-amber-50 text-amber-600 border border-amber-100",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-15.536a5 5 0 017.072 0m0 0l-2.828 2.829" />
        </svg>
      ),
    };
  }
  return {
    bg: "bg-blue-50 text-blue-600 border border-blue-100",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  };
}

export function PortalDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bargainModalOpen, setBargainModalOpen] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [activeCalendarFilter, setActiveCalendarFilter] = useState("All");

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

  const pendingCount = dashboard?.pending_deliverable_count ?? pendingDeliverables.length;
  const ticketCount = dashboard?.open_ticket_count ?? ticketsData.filter(t => t.status === "open" || t.status === "in_progress").length;

  const rawNotifications = notifData?.items || [];
  const unreadCount = notifData?.unread_count ?? (rawNotifications.filter(n => !n.is_read).length || (pendingCount + ticketCount));

  const handleMarkAllRead = async () => {
    try {
      await request("/api/v1/notifications/mark-all-read", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    } catch {
      // ignore
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
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

  const handleDismissNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await request(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    } catch {
      // ignore
    }
  };

  const lead = dashboard?.assigned_team?.find(t => t.is_primary) || dashboard?.assigned_team?.[0];
  const specialists = dashboard?.assigned_team?.filter(t => !t.is_primary) || [];

  return (
    <div className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8">
      <PlanBargainCallModal isOpen={bargainModalOpen} onClose={() => setBargainModalOpen(false)} />
      <main className="max-w-[1440px] mx-auto space-y-6">

{/* BEGIN: Top Section - Profile & Enterprise Retainer Plan */}
<section className="grid grid-cols-1 lg:grid-cols-12 gap-6" data-purpose="top-overview-grid">
{/* Profile Card (Left 4 cols) */}
<div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:shadow-lg hover:border-blue-100/60 transition-all duration-500" data-purpose="user-profile-card">
  {/* Subtle Background Glow */}
  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl group-hover:bg-blue-100/50 transition-colors duration-700 pointer-events-none"></div>

  <div className="flex flex-col flex-1 relative z-10">
    
    {/* Profile Card Header */}
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Profile</h2>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-[9px] uppercase font-black bg-emerald-50 text-emerald-600 flex items-center gap-1.5 border border-emerald-100/50 shadow-xs">
          <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse"></span>
          {user?.account_status || "Active"}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap hidden sm:block">Synced just now</span>
        <button aria-label="Settings" className="text-slate-400 hover:text-blue-600 p-2 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-100/50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </button>
      </div>
    </div>
    
    {/* Main ID Section */}
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8">
      {/* Avatar */}
      <div className="relative shrink-0 group/avatar cursor-pointer">
        <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-2xl sm:rounded-[18px] bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-3xl sm:text-2xl shadow-lg shadow-blue-600/20 group-hover/avatar:scale-105 group-hover/avatar:rotate-3 transition-transform duration-300">
          {(dashboard?.company?.name?.[0] || user?.company_name?.[0] || user?.full_name?.[0] || "C").toUpperCase()}
        </div>
        <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-4 sm:h-4 bg-emerald-500 border-4 sm:border-[3px] border-white rounded-full shadow-sm"></span>
      </div>
      
      {/* Identity Info */}
      <div className="flex flex-col items-center sm:items-start min-w-0 text-center sm:text-left w-full">
        <h3 className="text-xl sm:text-lg font-black text-slate-900 leading-tight mb-1 truncate w-full">
          {dashboard?.company?.name || user?.company_name || (user?.full_name ? user.full_name.replace(/\s*\(Stage \d+\)/i, "") : "Brand Workspace")}
        </h3>
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2 w-full">
          <span className="shrink-0 bg-[#EEF4FF] text-[#0052FF] text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-[#D1E0FF]">
            {user?.onboarding_status ? user.onboarding_status.replace(/_/g, " ").toUpperCase() : "STAGE 1"}
          </span>
          <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
          <span className="text-[11px] sm:text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 truncate max-w-[120px]">
            {user?.role === "client" ? "Brand Partner" : (user?.role || "Client Member")}
          </span>
        </div>
        <p className="text-[11px] font-semibold text-slate-500 truncate w-full max-w-[250px]">
          {dashboard?.brand_summary || (dashboard?.company?.name ? `${dashboard.company.name} Workspace` : (user?.company_name ? `${user.company_name} Workspace` : "Creative Brand Workspace"))}
        </p>
      </div>
    </div>
    
    {/* Contact Details List */}
    <div className="flex flex-col gap-2.5 mb-6">
      {/* Email */}
      <div className="bg-slate-50/80 border border-slate-100/80 rounded-[14px] p-2.5 flex items-center gap-3 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all cursor-default group/item">
        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center shrink-0 shadow-xs group-hover/item:border-blue-200 group-hover/item:text-blue-600 transition-colors">
          <svg className="w-3.5 h-3.5 text-slate-400 group-hover/item:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Email Address</p>
          <p className="text-xs font-bold text-slate-700 truncate group-hover/item:text-slate-900 transition-colors leading-none">{user?.email || "No Email"}</p>
        </div>
      </div>

      {/* Location & Time Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-50/80 border border-slate-100/80 rounded-[14px] p-2.5 flex items-center gap-2.5 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all cursor-default group/item">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center shrink-0 shadow-xs group-hover/item:scale-105 transition-transform">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Status</p>
            <p className="text-xs font-bold text-slate-700 truncate leading-none">
              {subscriptionActive ? "Retainer Active" : "Pending Retainer"}
            </p>
          </div>
        </div>

        <div className="bg-slate-50/80 border border-slate-100/80 rounded-[14px] p-2.5 flex items-center gap-2.5 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all cursor-default group/item">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center shrink-0 shadow-xs group-hover/item:scale-105 transition-transform">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <p className="text-[10px] font-extrabold text-emerald-600/80 uppercase tracking-wider mb-0.5 leading-none">Portal Sync</p>
            <p className="text-xs font-bold text-emerald-700 truncate leading-none">Online • Live</p>
          </div>
        </div>
      </div>
    </div>
    
    {/* Instagram Connection */}
    <Link to="/portal/account" className="bg-gradient-to-r from-rose-50/50 to-orange-50/50 border border-rose-100/80 rounded-[16px] p-3 flex items-center justify-between shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-pointer group mt-auto mb-6 block">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20 group-hover:scale-105 group-hover:rotate-6 transition-transform duration-300">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-900 leading-tight truncate">
            @{((dashboard?.company?.name || user?.company_name || user?.full_name || "brand").toLowerCase().replace(/[^a-z0-9]/g, ''))}
          </p>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate group-hover:text-rose-600 transition-colors">
            {subscriptionActive ? "Connected Channel" : "Connect Account"}
          </p>
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-[9px] uppercase tracking-wider font-extrabold inline-flex items-center gap-1.5 border shadow-xs whitespace-nowrap ml-2 ${
        subscriptionActive
          ? "bg-white text-emerald-600 border-emerald-100 group-hover:bg-emerald-50"
          : "bg-white text-slate-500 border-slate-200"
      }`}>
        <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${subscriptionActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
        {subscriptionActive ? "Live" : "Setup"}
      </span>
    </Link>
  </div>
  
  {/* Profile Footer Links */}
  <div className="flex items-center justify-between pt-5 border-t border-slate-100/90 relative z-10">
    <Link to="/portal/account" className="flex items-center gap-1.5 font-bold text-slate-400 hover:text-slate-800 transition-colors cursor-pointer group text-xs">
      <svg className="w-3.5 h-3.5 shrink-0 group-hover:-rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
      </svg>
      <span className="whitespace-nowrap">Reset Password</span>
    </Link>
    <Link to="/portal/account" className="shrink-0 bg-slate-900 hover:bg-black text-white font-black px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer whitespace-nowrap text-xs group">
      Edit Details
      <svg className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path>
      </svg>
    </Link>
  </div>
</div>
{/* Active Retainer Card (Right 8 cols) */}
        <div className="lg:col-span-8 card-surface card-interactive p-6 sm:p-8 flex flex-col justify-between" data-purpose="active-retainer-card">
          <div className="flex flex-col flex-1">
            
            {/* Retainer Top Header & Price */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 tracking-wide shadow-xs ${
                    subscriptionActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                      : "bg-amber-50 text-amber-700 border border-amber-200/80"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${subscriptionActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
                    {subscriptionActive ? "ACTIVE RETAINER" : "NO ACTIVE RETAINER"}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {subscriptionActive ? "Monthly Billing Cycle" : "Pending Onboarding / Payment"}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  {subscriptionActive ? (dashboard?.active_plan?.name || "Active Retainer") : "No Retainer Activated"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1 leading-relaxed">
                  {subscriptionActive
                    ? `Dedicated creative execution & weekly production sprints for ${dashboard?.company?.name || user?.company_name || "your brand"}.`
                    : "Select an execution tier to assign your dedicated creative squad and unlock production sprints."}
                </p>
              </div>

              <div className="sm:text-right shrink-0 flex flex-col sm:items-end">
                <div className="flex items-baseline sm:justify-end">
                  <span className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
                    {subscriptionActive && (dashboard?.active_plan as any)?.price_minor
                      ? "₹" + Number(((dashboard?.active_plan as any).price_minor / 100)).toLocaleString("en-IN")
                      : "₹0"}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-400 ml-1">/mo</span>
                </div>
                <div className="mt-2 flex sm:justify-end">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shadow-xs ${
                    subscriptionActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100/90"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}>
                    <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {subscriptionActive ? "Unlimited revisions" : "Retainer required"}
                  </span>
                </div>
              </div>
            </div>

            {/* Specifications & Add-ons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-2">
              
              {/* Left Container: PLAN SPECIFICATIONS & ALLOCATION */}
              <div className="bg-[#F8FAFC]/80 border border-slate-200/70 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                      PLAN SPECIFICATIONS &amp; ALLOCATION
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200/70 shadow-xs">
                      {subscriptionActive ? "Current Sprint" : "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {/* Sprint Hours */}
                    <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-blue-200/80 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth="2"></circle>
                              <path d="M12 6v6l4 2" strokeLinecap="round" strokeWidth="2"></path>
                            </svg>
                          </div>
                          <span className="text-xs font-bold text-slate-800">Sprint Hours</span>
                        </div>
                        <div className="text-xs font-medium">
                          <span className="text-sm font-black text-slate-900">{subscriptionActive ? "124" : "0"}</span>
                          <span className="text-slate-400 font-medium"> / {subscriptionActive ? "160 hrs" : "0 hrs"}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: subscriptionActive ? "77.5%" : "0%" }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-medium">
                        <span className="text-slate-400">{subscriptionActive ? "77.5% utilized" : "0% utilized"}</span>
                        <span className="text-blue-600 font-semibold">
                          {subscriptionActive ? "36 hours remaining in cycle" : "Plan required"}
                        </span>
                      </div>
                    </div>

                    {/* Active Requests */}
                    <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-emerald-200/80 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            </svg>
                          </div>
                          <span className="text-xs font-bold text-slate-800">Active Requests</span>
                        </div>
                        <div className="text-xs font-bold text-slate-700">
                          {subscriptionActive ? "4 Parallel" : "0 Parallel"}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: subscriptionActive ? "80%" : "0%" }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-medium">
                        <span className="text-slate-400">{subscriptionActive ? "80% concurrency" : "0% concurrency"}</span>
                        <span className="text-emerald-600 font-semibold">
                          {subscriptionActive ? "4 of 5 max parallel tracks" : "Locked"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Container: CONFIGURED ADD-ONS */}
              <div className="bg-[#F8FAFC]/80 border border-slate-200/70 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                      CONFIGURED ADD-ONS
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200/70 shadow-xs">
                      {subscriptionActive ? "+ ₹15,000/mo" : "+ ₹0/mo"}
                    </span>
                  </div>

                  {subscriptionActive ? (
                    <div className="space-y-3.5">
                      {/* Add-on 1 */}
                      <Link
                        to="/portal/payments"
                        className="bg-white border border-slate-200/60 rounded-xl p-3.5 sm:p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-blue-300 hover:scale-[1.01] transition-all duration-300 flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-xs">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              4K Motion &amp; Animation Sprint
                            </h4>
                            <p className="text-[11px] text-slate-400 font-normal mt-0.5 truncate">
                              3x 30s 3D motion renders / mo
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-xs sm:text-sm font-black text-slate-900">₹10,000</span>
                          <span className="text-[11px] font-medium text-slate-400">/mo</span>
                        </div>
                      </Link>

                      {/* Add-on 2 */}
                      <Link
                        to="/portal/payments"
                        className="bg-white border border-slate-200/60 rounded-xl p-3.5 sm:p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-amber-300 hover:scale-[1.01] transition-all duration-300 flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-xs">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate">
                              24h Priority Turnaround SLA
                            </h4>
                            <p className="text-[11px] text-slate-400 font-normal mt-0.5 truncate">
                              Expedited production access
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-xs sm:text-sm font-black text-slate-900">₹5,000</span>
                          <span className="text-[11px] font-medium text-slate-400">/mo</span>
                        </div>
                      </Link>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200/60 rounded-xl p-6 text-center flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-slate-700">No Add-Ons Configured</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                        Add-ons like 4K renders and priority SLA can be configured with your retainer.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Retainer Card Footer */}
          <div className="flex flex-wrap items-center justify-between pt-6 mt-4 gap-3">
            <Link
              to="/portal/payments"
              className="bg-[#0052FF] hover:bg-[#0045D8] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer shrink-0"
            >
              <svg className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
              </svg>
              <span>{subscriptionActive ? "Upgrade Plan" : "Choose Retainer Plan"}</span>
            </Link>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
              <Link to="/portal/payments" className="text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                {subscriptionActive ? "Manage Plan" : "Explore Retainers"}
              </Link>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <Link to="/portal/payments" className="text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                Billing History
              </Link>
            </div>
          </div>
        </div>
      </section>
{/* END: Top Section */}
{/* BEGIN: Middle Section - Creative Pod & Notifications */}
<section className="grid grid-cols-1 lg:grid-cols-12 gap-6" data-purpose="team-and-notifications-grid">{/* Left Card: Creative Pod (7 cols) */}
        <div className="lg:col-span-7 card-surface card-interactive p-6 sm:p-7 flex flex-col justify-between" data-purpose="creative-pod-card">
          <div className="flex flex-col flex-1">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">Creative Pod</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 tracking-wide shadow-xs ${
                    subscriptionActive
                      ? "bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${subscriptionActive ? "bg-[#6366F1]" : "bg-slate-400"}`}></span>
                    {subscriptionActive ? (dashboard?.assigned_team?.[0]?.pod_name || "Assigned Pod") : "Assignment Pending"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1 leading-relaxed">
                  Your dedicated full-stack creative execution unit.
                </p>
              </div>

              {subscriptionActive && (
                <a
                  href="https://slack.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-xs hover:border-slate-300 group cursor-pointer shrink-0"
                >
                  <svg className="w-3.5 h-3.5 text-slate-600 group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zm2-7a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5zm7 2a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zm-2 7a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z" />
                  </svg>
                  <span>#{((dashboard?.company?.name || user?.company_name || "creo-brand").toLowerCase().replace(/[^a-z0-9]/g, '-'))}</span>
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            {!subscriptionActive ? (
              /* Retainer Pending State */
              <div className="border border-slate-200/80 bg-slate-50/60 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center my-4">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-blue-600 mb-3.5">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1">
                  Creative Pod Provisioning Pending
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-500 max-w-md leading-relaxed mb-5">
                  Once your retainer is activated, Creo assigns your dedicated Creative Director, Senior Video Editor, and Visual Designer with direct Slack channel collaboration.
                </p>
                <Link
                  to="/portal/payments"
                  className="bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Activate Retainer to Assign Pod</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            ) : (
              <>
                {/* Pod Lead Highlight Box */}
                <Link
                  to="/portal/creative-pod"
                  className="border border-[#DCE9FE]/90 bg-[#F4F8FE]/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 my-4 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] hover:border-blue-300 hover:shadow-md transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-[#0052FF] text-white font-black flex items-center justify-center text-lg shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                        {lead?.name ? lead.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() : "PL"}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs"></span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <h3 className="text-base sm:text-[17px] font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                          {lead?.name || "Pod Lead"}
                        </h3>
                        <span className="text-xs sm:text-sm font-semibold text-slate-400">
                          (Team Lead)
                        </span>
                        <span className="bg-[#0052FF] text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ml-1">
                          POD LEAD
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-[13px] font-medium text-slate-500">
                        <span className="font-bold text-slate-700">{lead?.role || "Creative Director"}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                        <span>Available for fast triage &amp; strategy</span>
                      </div>
                    </div>
                  </div>

                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-2 shadow-xs shrink-0 whitespace-nowrap self-start sm:self-auto">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Active in Slack
                  </span>
                </Link>

                {/* Dedicated Team Specialists Section */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3">
                    <span>DEDICATED TEAM SPECIALISTS</span>
                    <span className="text-slate-400 font-bold">{specialists.length} Active {specialists.length === 1 ? 'Expert' : 'Experts'}</span>
                  </div>

                  {specialists.length > 0 ? (
                    <div className="space-y-3">
                      {specialists.slice(0, 2).map((spec: any) => (
                        <Link
                          key={spec.id || spec.name}
                          to="/portal/creative-pod"
                          className="bg-white border border-slate-200/70 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-blue-200/80 transition-all duration-300 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center text-sm shrink-0 group-hover:scale-105 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shadow-xs">
                              {spec.name ? spec.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() : "TM"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {spec.name}
                                </h4>
                                <span className="text-xs text-slate-400 font-semibold truncate">
                                  ({spec.raw_role || spec.role || "Specialist"})
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                                {spec.role || "Creative Execution Specialist"}
                              </p>
                            </div>
                          </div>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            Active
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-4 text-center">
                      <p className="text-xs font-medium text-slate-500">
                        Additional pod specialists are currently being provisioned by your Pod Lead.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Pod Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-5 border-t border-slate-100/90 mt-5 gap-3">
            {subscriptionActive ? (
              <>
                <Link
                  to="/portal/calendar"
                  className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors group cursor-pointer min-w-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <span className="truncate">
                    Weekly Growth Sync: <span className="font-normal text-slate-500">Live with Pod Lead</span>
                  </span>
                </Link>

                <a
                  href="https://meet.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#F0F6FF] hover:bg-[#E2EFFF] text-[#0052FF] border border-[#D0E2FF] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs hover:shadow cursor-pointer shrink-0"
                >
                  <svg className="w-4 h-4 text-[#0052FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                  <span>Launch Google Meet</span>
                </a>
              </>
            ) : (
              <div className="w-full flex items-center justify-between text-xs text-slate-400">
                <span>Private Slack workspace &amp; sync cadence assigned upon onboarding</span>
                <Link to="/portal/payments" className="font-bold text-blue-600 hover:text-blue-700">
                  Choose Retainer Plan →
                </Link>
              </div>
            )}
          </div>
        </div>
        {/* Right Card: Notifications (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 sm:p-7 flex flex-col justify-between group hover:shadow-lg hover:border-blue-100/60 transition-all duration-500 relative overflow-hidden" data-purpose="notifications-card">
          <div className="flex flex-col flex-1 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Notifications</h2>
                <span className="min-w-[22px] h-5.5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold flex items-center justify-center shadow-md shadow-rose-500/20">
                  {unreadCount}
                </span>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  Mark all read
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mb-5">
              Real-time billing &amp; creative support updates for {dashboard?.company?.name || user?.company_name || "your brand workspace"}
            </p>

            {/* Notification Items List */}
            <div className="space-y-3">
              {rawNotifications.length > 0 ? (
                (showAllNotifications ? rawNotifications : rawNotifications.slice(0, 3)).map((n) => {
                  const iconConfig = getNotifIcon(n.title, n.link);
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className={`rounded-2xl p-4 flex items-start gap-4 relative group/item transition-all duration-300 cursor-pointer border hover:shadow-md hover:-translate-y-0.5 ${
                        n.is_read ? "bg-white border-slate-100/80 opacity-80" : "bg-white border-blue-100/50 shadow-sm"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-transform shadow-xs ${iconConfig.bg}`}>
                        {iconConfig.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-xs sm:text-[13px] font-black leading-tight truncate transition-colors ${n.is_read ? "text-slate-700" : "text-slate-900 group-hover/item:text-blue-600"}`}>
                            {n.title}
                          </h4>
                          {!n.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2 pr-2">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {getRelativeTime(n.created_at)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        {n.link && (
                          <Link
                            to={n.link}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!n.is_read) handleDismissNotif(n.id, e);
                            }}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                          >
                            View
                          </Link>
                        )}
                        {!n.is_read && (
                          <button
                            onClick={(e) => handleDismissNotif(n.id, e)}
                            title="Dismiss"
                            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : pendingCount > 0 || ticketCount > 0 ? (
                <>
                  {/* Kept existing fallback for pending/tickets */}
                </>
              ) : (
                <div className="py-10 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-500">All caught up!</p>
                  <p className="text-xs text-slate-400 mt-1">No new notifications.</p>
                </div>
              )}
            </div>
          </div>

          {/* Notifications Footer */}
          <div className="flex justify-center pt-5 border-t border-slate-100/90 mt-5 relative z-10">
            <button
              onClick={() => setShowAllNotifications(!showAllNotifications)}
              className="text-xs font-black text-blue-600 hover:text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all cursor-pointer flex items-center gap-1.5 group"
            >
              {showAllNotifications ? "Show Recent" : `View All Notifications (${rawNotifications.length || (pendingCount + ticketCount)})`}
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>
{/* END: Middle Section */}
{/* BEGIN: Content Calendar Section */}
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
{/* END: Content Calendar Section */}
{/* BEGIN: Deliverables & Support Section */}
<section className="grid grid-cols-1 lg:grid-cols-12 gap-6" data-purpose="deliverables-support-grid">
  {/* Left Card: Deliverables & Approvals (6 cols) */}
  <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 sm:p-8 flex flex-col justify-between group/deliv hover:shadow-lg hover:border-blue-100/60 transition-all duration-500" data-purpose="deliverables-card">
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
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
        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
          {subscriptionActive ? "Current Sprint" : "Retainer Required"}
        </span>
      </div>
      
      {!subscriptionActive ? (
        /* Deliverables Locked Container */
        <div className="border border-slate-200/80 bg-slate-50/60 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center my-2">
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
        <div className="space-y-4">
          {pendingDeliverables.slice(0, 2).map((item: any) => (
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
        <span>{subscriptionActive ? "Full Archive" : "View Deliverables"}</span>
        <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path>
        </svg>
      </Link>
    </div>
  </div>

  {/* Right Card: Support Tickets (6 cols) */}
  <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 sm:p-8 flex flex-col justify-between group/support hover:shadow-lg hover:border-blue-100/60 transition-all duration-500" data-purpose="support-tickets-card">
    <div>
      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-15.536a5 5 0 017.072 0m0 0l-2.828 2.829"></path>
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Support Tickets</h2>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold inline-flex items-center justify-center shadow-xs uppercase tracking-wider ${
              subscriptionActive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}>
              {subscriptionActive ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  2-Hour SLA Guarantee
                </>
              ) : (
                "Standard Queue"
              )}
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium">
            {subscriptionActive
              ? "Priority ticketing with dedicated senior DevOps engineers & creative pod leads."
              : "Standard onboarding & account queries for your workspace."}
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 self-start">
          <Link to="/portal/support" className="text-xs font-black text-white bg-[#0052FF] hover:bg-[#0045D8] px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer">
            <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
            <span>Raise a Ticket</span>
          </Link>
        </div>
      </div>
      
      {/* Metric SLA Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm relative overflow-hidden group/metric">
          <div className={`absolute bottom-0 left-0 h-1 bg-blue-600 rounded-r ${subscriptionActive ? "w-[85%]" : "w-0"}`}></div>
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">AVERAGE TURNAROUND</div>
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-black text-[#0052FF] tracking-tight">
            {subscriptionActive ? "1.8" : "Standard"} {subscriptionActive && <span className="text-lg font-bold text-blue-400">hrs</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            {subscriptionActive ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                <span className="text-[11px] font-bold text-emerald-600">Faster than 2.0h SLA target</span>
              </>
            ) : (
              <span className="text-[11px] font-bold text-slate-400">2.0h SLA activates with Retainer</span>
            )}
          </div>
        </div>
        
        <div className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm relative overflow-hidden group/metric">
          <div className={`absolute bottom-0 left-0 h-1 bg-emerald-500 rounded-r ${subscriptionActive ? "w-[99%]" : "w-0"}`}></div>
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              {subscriptionActive ? "SLA COMPLIANCE" : "OPEN TICKETS"}
            </div>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-500 tracking-tight">
            {subscriptionActive ? "99.4%" : `${ticketsData.filter((t: any) => t.status === "open" || t.status === "in_progress").length} Open`}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold text-slate-500">
              {subscriptionActive
                ? `Across ${ticketsData.length || 1} tickets resolved this cycle`
                : "Standard queue triage"}
            </span>
          </div>
        </div>
      </div>
      
      {/* Active Ticket Box or Empty State */}
      <div>
        {(() => {
          const liveTicket = ticketsData.find((t: any) => t.status === "open" || t.status === "in_progress");
          if (!subscriptionActive || !liveTicket) {
            return (
              <div className="py-8 text-center bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl flex flex-col items-center justify-center p-5">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 mb-2 shadow-xs">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-700">No Open Support Issues</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  {!subscriptionActive
                    ? "Have questions about your onboarding or retainer? Raise a ticket anytime."
                    : "All systems operating normally. Your creative pod has zero blocking tickets."}
                </p>
              </div>
            );
          }

          return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-2">
                  ACTIVE TICKET <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest">1 LIVE</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {liveTicket.updated_at ? getRelativeTime(liveTicket.updated_at) : "Recently updated"}
                </span>
              </div>
              
              <Link to="/portal/support" className="block border border-amber-200/60 rounded-2xl p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/30 hover:shadow-md hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group/ticket">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-black text-blue-600 bg-white border border-blue-100 px-2 py-1 rounded-md shadow-xs">
                      #{liveTicket.ticket_code || liveTicket.id.slice(0, 8)}
                    </span>
                    <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold inline-flex items-center justify-center bg-white text-amber-600 border border-amber-200 shadow-xs uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                      {liveTicket.status?.replace(/_/g, " ") || "In Progress"}
                    </span>
                    <span className="hidden sm:inline-block text-[10px] font-bold text-slate-500">
                      • {liveTicket.priority?.toUpperCase() || "NORMAL"} Priority
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-blue-600 group-hover/ticket:text-blue-700 flex items-center gap-1 transition-colors">
                    View Discussion Thread 
                    <svg className="w-3 h-3 group-hover/ticket:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                  </span>
                </div>
                
                <h3 className="text-sm sm:text-[15px] font-black text-slate-900 leading-tight mb-2 group-hover/ticket:text-blue-700 transition-colors">
                  {liveTicket.subject}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-medium mb-5 pr-4 line-clamp-2">
                  {liveTicket.description || "Active ticket with creative and technical support."}
                </p>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] pt-4 mt-2 border-t border-amber-200/40 gap-3">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[8px] font-black">
                      {(user?.full_name?.[0] || "U").toUpperCase()}
                    </div>
                    <span>Opened {liveTicket.created_at ? getRelativeTime(liveTicket.created_at) : "recently"}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-xs">
                    <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    <span className="font-bold text-blue-700">Assigned to <span className="text-slate-800">Creative &amp; Technical Pod</span></span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })()}
      </div>
    </div>
    
    {/* Support Footer */}
    <div className="flex flex-wrap items-center justify-between pt-5 border-t border-slate-100/90 mt-6 gap-4 text-xs relative z-10">
      <Link to="/portal/support" className="flex items-center gap-2 font-black text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer group">
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <span>View Support Desk ({ticketsData.length})</span>
        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      </Link>
      <div className="flex items-center gap-2 text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span>Support: <strong className="text-slate-900 ml-1">support@creo.network</strong></span>
      </div>
    </div>
  </div>
</section>
{/* END: Deliverables & Support Section */}
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
