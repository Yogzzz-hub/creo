import { Link, useLocation, useNavigate } from "react-router";
import { 
  Bell, 
  ChevronLeft, 
  Check, 
  CheckCheck, 
  CalendarCheck, 
  DollarSign, 
  Users, 
  Clock, 
  ExternalLink, 
  ShieldCheck, 
  Trash2, 
  LogOut, 
  Menu
} from "lucide-react";
import { AdminKPIs } from "../../types/ops";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useAdminSidebar } from "./AdminSidebarContext";

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
  type?: "leave" | "revenue" | "team" | "system" | "plan_negotiation" | string;
  is_read?: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [];

export function AdminTopHeader({
  title,
  activeTab = "Dashboard",
  setActiveTab: _setActiveTab,
  kpis: _kpis,
  refreshing: _refreshing,
  handleRefreshKpis: _handleRefreshKpis,
  showBackButton = false,
}: AdminTopHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { toggleMobile } = useAdminSidebar();

  const isAdminOrSuper = user?.role === "admin" || user?.role === "super_admin";
  const isTeamLead = user?.role === "team_lead";
  const isSpecialist =
    user?.role === "team_member" ||
    user?.role === "editor" ||
    user?.role === "designer";

  const isClientRole =
    user?.role === "client" ||
    (!isAdminOrSuper && !isTeamLead && !isSpecialist && location.pathname.startsWith("/portal"));

  const isMemberRole =
    !isClientRole &&
    (isSpecialist ||
      location.pathname.startsWith("/workstation") ||
      location.pathname.startsWith("/member"));

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
  const notificationsList = rawNotifications
    .filter((n) => !deletedIds.has(n.id))
    .filter((n) => {
      if (user?.role === "team_lead") {
        if (n.type === "revenue") return false;
        if (n.message.includes("Pod B") || n.message.includes("Pod C") || n.message.includes("Pod D") || n.message.includes("Pod E")) return false;
      }
      return true;
    })
    .map((n) => {
      const isRead = Boolean(n.is_read || readIds.has(n.id));
      if (user?.role === "team_lead") {
        if (n.link?.includes("/admin/leaves") || n.link?.includes("/admin/leave")) {
          return { ...n, is_read: isRead, link: "/lead/schedule" };
        }
        if (n.link?.includes("/admin/team")) {
          return { ...n, is_read: isRead, link: "/admin/pod-dashboard" };
        }
      }
      return { ...n, is_read: isRead };
    });
  const unreadCount = notificationsList.filter((n) => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    const allIds = notificationsList.map((n) => n.id);
    setReadIds((prev) => new Set([...prev, ...allIds]));
    try {
      await request("/api/v1/notifications/mark-all-read", {
        method: "POST",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    } catch {
      // optimistic fallback
    }
  };

  const handleMarkSingleAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setReadIds((prev) => new Set([...prev, id]));
    try {
      await request(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
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
      await request("/api/v1/notifications", {
        method: "DELETE",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    } catch {
      // already optimistically cleared
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    setReadIds((prev) => new Set([...prev, item.id]));
    try {
      await request(`/api/v1/notifications/${item.id}/read`, {
        method: "PATCH",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    } catch {
      // optimistic fallback
    }
    setNotificationOpen(false);

    // Plan Bargain Call notification redirection
    if (item.link?.includes("/admin/plans-and-negotiations")) {
      navigate(item.link);
    } else if (
      item.title?.toLowerCase().includes("plan bargain call") ||
      item.message?.toLowerCase().includes("bargain plan") ||
      item.type === "plan_negotiation"
    ) {
      navigate(
        item.link && item.link.startsWith("/admin/plans-and-negotiations")
          ? item.link
          : "/admin/plans-and-negotiations"
      );
    } else if (item.link) {
      navigate(item.link);
    }
  };

  const getNotifIcon = (type?: string) => {
    switch (type) {
      case "leave":
        return <CalendarCheck className="w-4 h-4 text-[#7FA0D6]" />;
      case "revenue":
        return <DollarSign className="w-4 h-4 text-[#BCCCE6]" />;
      case "team":
        return <Users className="w-4 h-4 text-[#D8BF9B]" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-[#BCCCE6]" />;
    }
  };

  const getNotifBadgeBg = (type?: string) => {
    switch (type) {
      case "leave":
        return "bg-[#7FA0D6]/15 border-[#7FA0D6]/30";
      case "revenue":
        return "bg-[#BCCCE6]/15 border-[#BCCCE6]/30";
      case "team":
        return "bg-[#D8BF9B]/15 border-[#D8BF9B]/30";
      default:
        return "bg-[#BCCCE6]/15 border-[#BCCCE6]/30";
    }
  };

  const resolvedTitle =
    title ||
    (location.pathname === "/portal" || location.pathname === "/portal/"
      ? "Client Dashboard"
      : location.pathname.startsWith("/portal/deliverables")
      ? "Content Deliverables"
      : location.pathname.startsWith("/portal/calendar")
      ? "Content Calendar"
      : location.pathname.startsWith("/portal/creative-pod")
      ? "Creative Pod"
      : location.pathname.startsWith("/portal/payments")
      ? "Plans & Billing"
      : location.pathname.startsWith("/portal/support")
      ? "Support Desk"
      : location.pathname.startsWith("/portal/account")
      ? "Account Settings"
      : location.pathname === "/portal/slack"
      ? "Slack Workspace Hub"
      : location.pathname.startsWith("/workstation/tasks") || location.pathname.startsWith("/member/tasks")
      ? "My Tasks"
      : location.pathname.startsWith("/workstation/schedule") || location.pathname.startsWith("/member/schedule")
      ? "My Schedule & PTO"
      : location.pathname.startsWith("/workstation") || location.pathname.startsWith("/member")
      ? "Workstation Overview"
      : location.pathname.includes("/slack")
      ? "Slack Workspace Hub"
      : location.pathname.includes("/admin/pod-dashboard") || location.pathname.includes("/lead/dashboard")
      ? "Team Details"
      : location.pathname.includes("/lead/tasks")
      ? "Content Engine"
      : location.pathname.includes("/lead/deliverables")
      ? "Content Engine"
      : location.pathname.includes("/lead/schedule")
      ? "Team Details"
      : location.pathname.includes("/lead/clients")
      ? "Client Details"
      : location.pathname.includes("/admin/revenue")
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
      : location.pathname.includes("/admin/settings")
      ? "System Settings"
      : activeTab);

  return (
    <div className="sticky top-0 z-40 w-full bg-[#0B111C]/90 backdrop-blur-md pt-2 sm:pt-2.5 pb-1.5 sm:pb-2 px-3.5 sm:px-6 lg:px-8 transition-all">
      <header className="max-w-[1500px] mx-auto bg-[#161F2D] rounded-xl sm:rounded-full border border-[#2A3446] px-3.5 sm:px-5 lg:px-6 py-1.5 sm:py-2 flex items-center justify-between shadow-[0_4px_20px_rgba(5,8,16,0.5)] min-h-[44px] sm:min-h-[48px]">
        {/* Left Section: Mobile Hamburger + Back Button + Mobile Brand Logo + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            type="button"
            onClick={toggleMobile}
            className="md:hidden size-8 rounded-full flex items-center justify-center text-[#97A0B3] hover:text-white hover:bg-[#161F2D] transition-all cursor-pointer border border-transparent hover:border-[#2A3446] focus:outline-none focus:ring-2 focus:ring-[#7FA0D6] shrink-0"
            aria-label="Open navigation sidebar"
            title="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {showBackButton && (
            <Link
              to={
                isAdminOrSuper
                  ? "/admin"
                  : isTeamLead
                  ? "/admin/pod-dashboard"
                  : isMemberRole
                  ? "/workstation"
                  : "/portal"
              }
              className="p-1 rounded-full hover:bg-[#161F2D] text-[#97A0B3] hover:text-white transition-colors shrink-0"
              title="Go Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
          )}

          {/* Brand Logo - visible on mobile where sidebar is inside drawer */}
          <Link
            to={
              isAdminOrSuper
                ? "/admin"
                : isTeamLead
                ? "/admin/pod-dashboard"
                : isMemberRole
                ? "/workstation"
                : "/portal"
            }
            className="md:hidden flex items-center gap-0.5 font-black text-white text-sm sm:text-base tracking-tight shrink-0 px-1 hover:opacity-85 transition-opacity"
            title="creo. Home"
          >
            creo<span className="text-[#7FA0D6] text-base sm:text-lg leading-none">.</span>
          </Link>

          <span className="h-4 w-px bg-[#2A3446] mx-1 hidden sm:block shrink-0" />

          {/* Active Page Title */}
          <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
            {resolvedTitle}
          </h1>
        </div>

        {/* Right Utility Icons (Bell with Functional Dropdown, Profile with Dropdown) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 justify-end">
          {/* Functional Notification Bell Container */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              title="Notifications"
              onClick={() => setNotificationOpen(!notificationOpen)}
              className={`size-8 sm:size-8.5 rounded-full flex items-center justify-center transition-all relative cursor-pointer ${
                notificationOpen
                  ? "bg-[#161F2D] text-white shadow-sm border border-[#7FA0D6]"
                  : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D]"
              }`}
              aria-label="Notifications"
            >
              <Bell className="size-4 sm:size-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-3.5 sm:size-4 bg-[#7FA0D6] text-[#0B111C] rounded-full text-[9px] sm:text-[10px] font-black flex items-center justify-center border border-[#161F2D] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notificationOpen && (
              <div className="absolute right-0 mt-2 sm:mt-3 w-[calc(100vw-24px)] sm:w-96 max-w-[400px] bg-[#161F2D] rounded-3xl shadow-[0_12px_40px_rgba(5,8,16,0.7)] border border-[#2A3446] z-50 overflow-hidden animate-scale-up text-left">
                {/* Header */}
                <div className="px-4 sm:px-5 py-3.5 border-b border-[#2A3446] flex items-center justify-between bg-[#0B111C]/60">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white">Notifications</h3>
                    {unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30">
                        {unreadCount} Unread
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#161F2D] text-[#97A0B3]">
                        All Caught Up
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] font-bold text-[#7FA0D6] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Mark all notifications as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Read
                      </button>
                    )}
                    {notificationsList.length > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-[11px] font-bold text-[#97A0B3] hover:text-[#D8BF9B] flex items-center gap-1 cursor-pointer transition-colors"
                        title="Delete all notifications"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification Items List */}
                <div className="max-h-[340px] sm:max-h-[380px] overflow-y-auto divide-y divide-[#2A3446] scrollbar-thin">
                  {notificationsList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 sm:p-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-[#161F2D] group relative ${
                        !item.is_read ? "bg-[#7FA0D6]/10" : "bg-transparent opacity-85"
                      }`}
                    >
                      {/* Icon */}
                      <div className={`size-8 sm:size-9 rounded-2xl flex items-center justify-center border shrink-0 ${getNotifBadgeBg(item.type)}`}>
                        {getNotifIcon(item.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs truncate ${!item.is_read ? "font-bold text-white" : "font-medium text-[#F1F5F9]"}`}>
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!item.is_read && (
                              <>
                                <span className="w-2 h-2 rounded-full bg-[#7FA0D6]" />
                                <button
                                  type="button"
                                  title="Mark as read"
                                  onClick={(e) => handleMarkSingleAsRead(e, item.id)}
                                  className="p-1 rounded-lg text-[#7FA0D6] hover:bg-[#161F2D] transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {/* Delete Single Notification Button */}
                            <button
                              type="button"
                              title="Delete notification"
                              onClick={(e) => handleDeleteNotification(e, item.id)}
                              className="p-1 rounded-lg text-[#97A0B3] hover:text-[#D8BF9B] hover:bg-[#161F2D] transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-[#97A0B3] line-clamp-2 leading-relaxed font-medium">
                          {item.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-[#97A0B3]/80 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.created_at || "Just now"}
                          </span>
                          {item.link && (
                            <span className="text-[#7FA0D6] font-bold flex items-center gap-0.5 hover:underline">
                              Open <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {notificationsList.length === 0 && (
                    <div className="p-8 text-center text-[#97A0B3] space-y-2">
                      <Bell className="w-8 h-8 text-[#2A3446] mx-auto" />
                      <p className="text-xs font-bold text-white">No notifications</p>
                      <p className="text-[11px] text-[#97A0B3]">You're all caught up with your workspace alerts.</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-[#0B111C]/60 border-t border-[#2A3446] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#97A0B3] font-medium">Real-time alerts</span>
                  <Link
                    to={isClientRole ? "/portal/deliverables" : isMemberRole ? "/workstation/schedule" : "/admin/leaves"}
                    onClick={() => setNotificationOpen(false)}
                    className="text-[11px] font-bold text-[#7FA0D6] hover:underline"
                  >
                    {isClientRole ? "View Deliverables →" : isMemberRole ? "View Schedule →" : "View Approvals →"}
                  </Link>
                </div>
              </div>
            )}
          </div>
          

          {/* Profile Avatar with Interactive Dropdown Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              title={user?.full_name || "Profile & Account"}
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="size-8 sm:size-8.5 rounded-full bg-[#BCCCE6] hover:bg-[#BCCCE6] text-[#0B111C] font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-[#050810]/40 cursor-pointer ml-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-[#7FA0D6]"
              aria-label="User profile menu"
            >
              {(user?.full_name?.[0] || user?.email?.[0] || (isClientRole ? "C" : isMemberRole ? "D" : "A")).toUpperCase()}
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 sm:mt-3 w-[calc(100vw-24px)] sm:w-72 max-w-[320px] bg-[#161F2D] rounded-3xl shadow-[0_12px_40px_rgba(5,8,16,0.7)] border border-[#2A3446] z-50 overflow-hidden animate-scale-up p-3 space-y-2 text-left">
                {/* User Header */}
                <div className="p-3 bg-[#0B111C]/80 rounded-2xl border border-[#2A3446] flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#BCCCE6] text-[#0B111C] font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    {(user?.full_name?.[0] || user?.email?.[0] || (isClientRole ? "C" : isMemberRole ? "D" : "A")).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">
                      {user?.full_name || (isClientRole ? (user?.company_name || "Client Account") : isMemberRole ? "Team Specialist" : user?.role === "team_lead" ? "Pod Lead" : "Creo Admin")}
                    </h4>
                    <p className="text-[11px] text-[#97A0B3] font-medium truncate">
                      {user?.email || (isClientRole ? "client@portal.creo" : isMemberRole ? "specialist@creo.agency" : "admin@creo.agency")}
                    </p>
                    <div className="mt-1">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 capitalize">
                        {isClientRole
                          ? "Client Account"
                          : isMemberRole
                          ? "Pod Specialist"
                          : user?.role === "team_lead"
                          ? "Pod Lead"
                          : user?.role?.replace("_", " ") || "Administrator"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="pt-2 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileDropdownOpen(false);
                      try {
                        await logout();
                      } catch {
                        // ignore
                      }
                      navigate("/auth");
                    }}
                    className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#D8BF9B] hover:bg-[#D8BF9B]/15 hover:border-[#D8BF9B]/30 border border-transparent transition-all cursor-pointer shadow-xs"
                  >
                    <LogOut className="w-4 h-4 text-[#D8BF9B]" />
                    <span>Sign Out / Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
