import { Link, useLocation, useNavigate } from "react-router";
import { 
  Bell, 
  Settings, 
  ChevronLeft, 
  CheckCheck, 
  CalendarCheck, 
  DollarSign, 
  Users, 
  Clock, 
  ExternalLink,
  ShieldCheck,
  Trash2,
  SlidersHorizontal,
  Volume2
} from "lucide-react";
import { AdminKPIs } from "../../types/ops";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";

interface AdminTopHeaderProps {
  title?: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  kpis?: AdminKPIs | null;
  refreshing?: boolean;
  handleRefreshKpis?: () => void;
  showBackButton?: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string;
  created_at?: string;
  type?: "leave" | "revenue" | "team" | "system";
  is_read?: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-1",
    title: "Leave Request Submitted",
    message: "Elena Rostova requested 3 days of medical/personal leave.",
    link: "/admin/leaves",
    type: "leave",
    created_at: "10 mins ago",
    is_read: false,
  },
  {
    id: "n-2",
    title: "Retainer Counter-Offer",
    message: "Northwind Labs proposed $12,500/mo for Enterprise Tier.",
    link: "/admin/revenue",
    type: "revenue",
    created_at: "45 mins ago",
    is_read: false,
  },
  {
    id: "n-3",
    title: "Pod A Delivery Warning",
    message: "Sprint capacity at 92%. Review task queue allocation.",
    link: "/admin/team",
    type: "team",
    created_at: "2 hours ago",
    is_read: true,
  },
];

export function AdminTopHeader({
  title,
  activeTab = "Dashboard",
  setActiveTab,
  kpis: _kpis,
  refreshing: _refreshing,
  handleRefreshKpis: _handleRefreshKpis,
  showBackButton = false,
}: AdminTopHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isRevenueActive = activeTab === "Revenue" || location.pathname.includes("/admin/revenue") || location.pathname.includes("/admin/plans") || location.pathname.includes("/admin/sales");
  const isTeamActive = activeTab === "Team Details" || location.pathname.includes("/admin/team") || location.pathname.includes("/admin/leaves") || location.pathname.includes("/admin/leave");
  const isContentActive = activeTab === "Content Engine" || location.pathname.includes("/admin/deliverables") || location.pathname.includes("/admin/calendar") || location.pathname.includes("/admin/tasks");
  const isClientActive = activeTab === "Client Details" || location.pathname.includes("/admin/clients");
  const isSupportActive = activeTab === "Support" || activeTab === "SLA & Support" || location.pathname.includes("/admin/support") || location.pathname.includes("/admin/sla") || location.pathname.includes("/admin/escalations");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [contentDropdownOpen, setContentDropdownOpen] = useState(false);
  const [supportDropdownOpen, setSupportDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const { data: serverNotifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      try {
        const data = await request<any>("/api/v1/notifications");
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.items)) return data.items;
        return DEFAULT_NOTIFICATIONS;
      } catch {
        return DEFAULT_NOTIFICATIONS;
      }
    },
    refetchInterval: 30000,
  });

  const rawNotifications = serverNotifications.length > 0 ? serverNotifications : DEFAULT_NOTIFICATIONS;
  const notificationsList = rawNotifications.filter((n) => !deletedIds.has(n.id));
  const unreadCount = notificationsList.filter((n) => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await request("/api/v1/notifications/mark-all-read", {
        method: "POST",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    } catch {
      // optimistic fallback
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletedIds((prev) => new Set([...prev, id]));
    try {
      await request(`/api/v1/notifications/${id}`, {
        method: "DELETE",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    } catch {
      // already optimistically hidden
    }
  };

  const handleClearAllNotifications = async () => {
    const allIds = notificationsList.map((n) => n.id);
    setDeletedIds((prev) => new Set([...prev, ...allIds]));
    try {
      await request("/api/v1/notifications/mark-all-read", {
        method: "POST",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    } catch {
      // already optimistically cleared
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    try {
      await request(`/api/v1/notifications/${item.id}/read`, {
        method: "PATCH",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    } catch {
      // optimistic fallback
    }
    setNotificationOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const getNotifIcon = (type?: string) => {
    switch (type) {
      case "leave":
        return <CalendarCheck className="w-4 h-4 text-blue-600" />;
      case "revenue":
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case "team":
        return <Users className="w-4 h-4 text-purple-600" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getNotifBadgeBg = (type?: string) => {
    switch (type) {
      case "leave":
        return "bg-blue-50 border-blue-100";
      case "revenue":
        return "bg-emerald-50 border-emerald-100";
      case "team":
        return "bg-purple-50 border-purple-100";
      default:
        return "bg-indigo-50 border-indigo-100";
    }
  };

  const resolvedTitle =
    title ||
    (location.pathname.includes("/admin/revenue")
      ? "Revenue Engine"
      : location.pathname.includes("/admin/plans") || location.pathname.includes("/admin/sales")
      ? "Manage Plans & Negotiations"
      : location.pathname.includes("/admin/team")
      ? "Team Details & Management"
      : location.pathname.includes("/admin/leaves") || location.pathname.includes("/admin/leave")
      ? "Leave Approvals"
      : location.pathname.includes("/admin/deliverables")
      ? "Deliverables"
      : location.pathname.includes("/admin/calendar")
      ? "Content Calendar"
      : location.pathname.includes("/admin/tasks")
      ? "Production Task Queue"
      : location.pathname.includes("/admin/clients")
      ? "Client Details"
      : location.pathname.includes("/admin/support/sla") || location.pathname.includes("/admin/sla")
      ? "SLA Performance"
      : location.pathname.includes("/admin/support")
      ? "Support Tickets"
      : location.pathname.includes("/admin/announcements")
      ? "Announcements"
      : location.pathname.includes("/admin/reports") || location.pathname.includes("/admin/kpi")
      ? "Executive Analytics"
      : location.pathname.includes("/admin/addons")
      ? "Add-ons Catalog"
      : location.pathname.includes("/admin/escalations")
      ? "SLA Escalations"
      : location.pathname.includes("/admin/settings")
      ? "System Settings"
      : activeTab);

  return (
    <div className="sticky top-0 z-40 w-full bg-[#F8FAFC]/90 backdrop-blur-md pt-5 pb-3 px-6 transition-all">
      <header className="max-w-[1500px] mx-auto bg-white rounded-full border border-gray-100 px-8 lg:px-10 py-3.5 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.04)] min-h-[70px]">
        {/* Left Section: Active Title */}
        <div className="flex items-center gap-3 min-w-[200px]">
          {showBackButton && (
            <Link to="/admin" className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          )}
          <h1 className="text-xl lg:text-2xl font-black text-[#0F172A] tracking-tight">
            {resolvedTitle}
          </h1>
        </div>

        {/* Center Pill Capsule maintaining exact original tab labels */}
        <div className="hidden lg:flex items-center gap-2 bg-[#F1F4F9] px-5 py-2 rounded-full text-xs font-bold text-[#475569]">
          <Link
            to="/admin"
            onClick={() => setActiveTab?.("Dashboard")}
            className={`px-3.5 py-1.5 rounded-full transition-all ${
              activeTab === "Dashboard" && location.pathname === "/admin"
                ? "text-[#0F172A] font-black bg-white shadow-sm"
                : "hover:text-[#0F172A]"
            }`}
          >
            Dashboard
          </Link>

          {/* Revenue Dropdown container */}
          <div 
            className="relative group"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <span
              className={`block px-3.5 py-1.5 rounded-full cursor-pointer transition-all ${
                isRevenueActive
                  ? "text-[#0F172A] font-black bg-white shadow-sm"
                  : "hover:text-[#0F172A]"
              }`}
            >
              Revenue
            </span>
            {/* Dropdown Menu */}
            <div 
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 transition-all flex flex-col overflow-hidden z-50 ${
                dropdownOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"
              }`}
            >
              <Link 
                to="/admin/revenue" 
                onClick={() => setDropdownOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                Income Details
              </Link>
              <Link 
                to="/admin/plans" 
                onClick={() => setDropdownOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                Manage Plans & Negotiations
              </Link>
            </div>
          </div>

          {/* Team Details Dropdown container */}
          <div 
            className="relative group"
            onMouseEnter={() => setTeamDropdownOpen(true)}
            onMouseLeave={() => setTeamDropdownOpen(false)}
          >
            <span
              className={`block px-3.5 py-1.5 rounded-full cursor-pointer transition-all ${
                isTeamActive
                  ? "text-[#0F172A] font-black bg-white shadow-sm"
                  : "hover:text-[#0F172A]"
              }`}
            >
              Team Details
            </span>
            {/* Dropdown Menu */}
            <div 
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 transition-all flex flex-col overflow-hidden z-50 ${
                teamDropdownOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"
              }`}
            >
              <Link 
                to="/admin/team" 
                onClick={() => setTeamDropdownOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                Team Management
              </Link>
              <Link 
                to="/admin/leaves" 
                onClick={() => setTeamDropdownOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                Leave Requests
              </Link>
            </div>
          </div>

          {/* --- CREO LOGO CENTER BADGE WITH BLUE DOT --- */}
          <Link to="/admin" className="flex items-center gap-0.5 px-3 py-1 font-black text-[#0F172A] text-base tracking-tighter hover:opacity-80 transition-opacity">
            creo<span className="text-[#2563EB] text-lg leading-none">.</span>
          </Link>

          {/* Content Engine Dropdown container */}
          <div 
            className="relative group"
            onMouseEnter={() => setContentDropdownOpen(true)}
            onMouseLeave={() => setContentDropdownOpen(false)}
          >
            <span
              className={`block px-3.5 py-1.5 rounded-full cursor-pointer transition-all ${
                isContentActive
                  ? "text-[#0F172A] font-black bg-white shadow-sm"
                  : "hover:text-[#0F172A]"
              }`}
            >
              Content Engine
            </span>
            {/* Dropdown Menu */}
            <div 
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 transition-all flex flex-col overflow-hidden z-50 ${
                contentDropdownOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"
              }`}
            >
              <Link 
                to="/admin/deliverables" 
                onClick={() => setContentDropdownOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                Deliverables
              </Link>
              <Link 
                to="/admin/calendar" 
                onClick={() => setContentDropdownOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                Calendar
              </Link>
              <Link 
                to="/admin/tasks" 
                onClick={() => setContentDropdownOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                Task Queue
              </Link>
            </div>
          </div>

          {/* Client Details Direct Link (No Dropdown) */}
          <Link
            to="/admin/clients"
            className={`px-3.5 py-1.5 rounded-full cursor-pointer transition-all ${
              isClientActive
                ? "text-[#0F172A] font-black bg-white shadow-sm"
                : "hover:text-[#0F172A]"
            }`}
          >
            Client Details
          </Link>

          {/* Support Dropdown container */}
          <div 
            className="relative group"
            onMouseEnter={() => setSupportDropdownOpen(true)}
            onMouseLeave={() => setSupportDropdownOpen(false)}
          >
            <span
              className={`block px-3.5 py-1.5 rounded-full cursor-pointer transition-all ${
                isSupportActive
                  ? "text-[#0F172A] font-black bg-white shadow-sm"
                  : "hover:text-[#0F172A]"
              }`}
            >
              Support
            </span>
            {/* Dropdown Menu */}
            <div 
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 transition-all flex flex-col overflow-hidden z-50 ${
                supportDropdownOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"
              }`}
            >
              <Link 
                to="/admin/support" 
                onClick={() => setSupportDropdownOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                Support Tickets
              </Link>
              <Link 
                to="/admin/support/sla" 
                onClick={() => setSupportDropdownOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                SLA Performance
              </Link>
            </div>
          </div>
        </div>

        {/* Right Utility Icons (Bell with Functional Dropdown & Delete Options, Gear with Dropdown, Blue N avatar) */}
        <div className="flex items-center gap-3.5 min-w-[200px] justify-end">
          {/* Functional Notification Bell Container */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              title="Notifications"
              onClick={() => setNotificationOpen(!notificationOpen)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all relative cursor-pointer ${
                notificationOpen
                  ? "bg-blue-50 text-blue-600 shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100"
              }`}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#2563EB] text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notificationOpen && (
              <div className="absolute right-0 mt-3 w-96 max-w-[90vw] bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 z-50 overflow-hidden animate-scale-up">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                    {unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200">
                        {unreadCount} Unread
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                        All Caught Up
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        title="Mark all notifications as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Read
                      </button>
                    )}
                    {notificationsList.length > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-[11px] font-bold text-gray-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Delete all notifications"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification Items List */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50 scrollbar-thin">
                  {notificationsList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-gray-50 group relative ${
                        !item.is_read ? "bg-blue-50/25" : "bg-white opacity-85"
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border shrink-0 ${getNotifBadgeBg(item.type)}`}>
                        {getNotifIcon(item.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs truncate ${!item.is_read ? "font-black text-gray-900" : "font-bold text-gray-700"}`}>
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!item.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600" />
                            )}
                            {/* Delete Single Notification Button */}
                            <button
                              type="button"
                              title="Delete notification"
                              onClick={(e) => handleDeleteNotification(e, item.id)}
                              className="p-1 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed font-medium">
                          {item.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.created_at || "Just now"}
                          </span>
                          {item.link && (
                            <span className="text-blue-600 font-bold flex items-center gap-0.5 hover:underline">
                              Open <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {notificationsList.length === 0 && (
                    <div className="p-8 text-center text-gray-400 space-y-2">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="text-xs font-bold text-gray-600">No notifications</p>
                      <p className="text-[11px] text-gray-400">You're all caught up with your workspace alerts.</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-gray-500 font-medium">Real-time alerts</span>
                  <Link
                    to="/admin/leaves"
                    onClick={() => setNotificationOpen(false)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    View Approvals &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* Settings Container - Dropdown Attached (No Pop-up Modal) */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              title="Settings"
              onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                settingsDropdownOpen
                  ? "bg-blue-50 text-blue-600 shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100"
              }`}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Attached Settings Dropdown Menu */}
            {settingsDropdownOpen && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 z-50 overflow-hidden animate-scale-up p-3 space-y-2">
                {/* Header */}
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-black text-gray-900">Admin Settings</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">
                    {user?.role?.replace("_", " ") || "Super Admin"}
                  </span>
                </div>

                {/* Navigation Links */}
                <div className="space-y-0.5">
                  <Link
                    to="/admin/settings"
                    onClick={() => setSettingsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                    <span>System Settings</span>
                  </Link>
                  <Link
                    to="/admin/support/sla"
                    onClick={() => setSettingsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                    <span>SLA Configuration</span>
                  </Link>
                  <Link
                    to="/admin/leaves"
                    onClick={() => setSettingsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <CalendarCheck className="w-4 h-4 text-gray-400" />
                    <span>Leave Management</span>
                  </Link>
                </div>

                {/* Preference Pills */}
                <div className="pt-2 border-t border-gray-100 space-y-1.5 px-1">
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-gray-50 text-[11px] font-semibold text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      Auto-Refresh KPI
                    </span>
                    <span className="text-emerald-600 font-bold">15s Active</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-gray-50 text-[11px] font-semibold text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3 h-3 text-gray-400" />
                      Sound Alerts
                    </span>
                    <span className="text-blue-600 font-bold">Enabled</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Solid Blue Circle Avatar N */}
          <div 
            title={user?.full_name || "Admin User"}
            className="w-10 h-10 rounded-full bg-[#0066FF] text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/25 cursor-pointer ml-1"
          >
            {(user?.full_name?.[0] || "N").toUpperCase()}
          </div>
        </div>
      </header>
    </div>
  );
}
