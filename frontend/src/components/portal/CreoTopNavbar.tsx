import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { useConfirm } from "../ui/ConfirmDialog";

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

function getPageName(pathname: string, short: boolean = false) {
  if (pathname === "/portal") return "Dashboard";
  if (pathname.includes("/payments")) return "Plans";
  if (pathname.includes("/creative-pod")) return "Creative Pod";
  if (pathname.includes("/calendar")) return short ? "Calendar" : "Content Calendar";
  if (pathname.includes("/deliverables")) return short ? "Deliverables" : "Content Deliverables";
  if (pathname.includes("/support")) return "Support";
  if (pathname.includes("/account")) return "Settings";
  return "Dashboard";
}

export function CreoTopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  
  
  // Notification State
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const bellRef = useRef<HTMLButtonElement>(null);
  const confirm = useConfirm();

  const { data: notifData } = useQuery<NotificationPayload>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      return await request<NotificationPayload>("/api/v1/notifications");
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

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
      setNotificationOpen(false);
      navigate(item.link);
    }
  };

  async function handleLogout() {
    const ok = await confirm({
      title: "Sign Out of Client Portal?",
      description: "Are you sure you want to end your session?",
      confirmText: "Sign Out",
      cancelText: "Stay Logged In",
      tone: "warning",
      icon: "logout",
    });
    if (!ok) return;
    await logout();
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitial = user?.full_name?.charAt(0)?.toUpperCase() || "A";

  return (
    <header className="fixed top-4 inset-x-4 lg:inset-x-8 z-[100] transition-all pointer-events-none">
      <div className="flex items-center justify-between px-6 max-w-[1600px] mx-auto h-16 w-full bg-[#161F2D]/95 backdrop-blur-md rounded-full shadow-[0_4px_30px_rgba(5,8,16,0.6)] border border-[#2A3446] pointer-events-auto">
        {/* Mobile Left: Logo */}
        <div className="flex-1 flex items-center xl:hidden min-w-0 pr-2">
          <Link to="/portal" className="flex items-center hover:scale-105 hover:drop-shadow-sm transition-all shrink-0">
            <span className="text-[20px] font-black tracking-tighter text-white">creo<span className="text-[#7FA0D6]">.</span></span>
          </Link>
        </div>

        {/* Desktop Left: Page Title */}
        <div className="flex-1 shrink-0 hidden xl:flex items-center">
          <h1 className="text-[17px] font-black tracking-tight text-white">
            {getPageName(location.pathname)}
          </h1>
        </div>

        {/* Center: Nav Pill (Desktop Only) */}
        <div className="hidden xl:flex absolute left-1/2 -translate-x-1/2 items-center justify-center pointer-events-none">
          
          {/* Desktop Center: Nav Pill */}
          <nav className="bg-[#0B111C]/90 rounded-full p-1.5 hidden xl:flex items-center gap-1 border border-[#2A3446] pointer-events-auto shadow-inner">
            <Link
              to="/portal"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname === "/portal" || location.pathname === "/portal/"
                  ? "bg-[#BCCCE6] text-[#0B111C] font-bold shadow-[0_2px_10px_rgba(188,204,230,0.25)]"
                  : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/portal/payments"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname.includes("/payments")
                  ? "bg-[#BCCCE6] text-[#0B111C] font-bold shadow-[0_2px_10px_rgba(188,204,230,0.25)]"
                  : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Plans
            </Link>
            <Link
              to="/portal/creative-pod"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname.includes("/creative-pod")
                  ? "bg-[#BCCCE6] text-[#0B111C] font-bold shadow-[0_2px_10px_rgba(188,204,230,0.25)]"
                  : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Creative Pod
            </Link>

            {/* Logo in the middle */}
            <Link to="/portal" className="px-4 py-1 flex items-center hover:scale-105 hover:drop-shadow-sm transition-all">
              <span className="text-[20px] font-black tracking-tighter text-white">creo<span className="text-[#7FA0D6]">.</span></span>
            </Link>

            <Link
              to="/portal/calendar"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname.includes("/calendar")
                  ? "bg-[#BCCCE6] text-[#0B111C] font-bold shadow-[0_2px_10px_rgba(188,204,230,0.25)]"
                  : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Calendar
            </Link>
            <Link
              to="/portal/deliverables"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname.includes("/deliverables")
                  ? "bg-[#BCCCE6] text-[#0B111C] font-bold shadow-[0_2px_10px_rgba(188,204,230,0.25)]"
                  : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Deliverables
            </Link>
            <Link
              to="/portal/support"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname.includes("/support")
                  ? "bg-[#BCCCE6] text-[#0B111C] font-bold shadow-[0_2px_10px_rgba(188,204,230,0.25)]"
                  : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Support
            </Link>
          </nav>
        </div>

        {/* Right: Utilities */}
        <div className="flex-1 flex items-center justify-end gap-3">
          
          {/* Notifications */}
          <div className="relative group">
            <button
              type="button"
              className="w-10 h-10 rounded-full border border-[#2A3446] flex items-center justify-center text-[#97A0B3] hover:text-[#BCCCE6] hover:bg-[#0B111C] hover:border-[#7FA0D6]/40 hover:scale-105 active:scale-95 transition-all relative shadow-xs"
              aria-label="Notifications"
              onClick={() => setNotificationOpen(!notificationOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#7FA0D6] text-[10px] font-bold text-[#0B111C] border-2 border-[#161F2D] shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown (Click activated to mark read) */}
            {notificationOpen && (
              <div className="absolute right-0 top-full pt-4 z-[150] animate-scale-up" ref={bellRef as any}>
                <div className="w-80 bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-[0_12px_40px_rgba(5,8,16,0.8)] overflow-hidden">
                  <div className="p-4 border-b border-[#2A3446] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-bold text-[#7FA0D6] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs font-medium text-[#97A0B3]">No new notifications</div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleItemClick(n)}
                          className={`w-full text-left p-4 hover:bg-[#0B111C]/60 transition-colors border-b border-[#2A3446]/60 last:border-b-0 ${
                            !n.is_read ? "bg-[#7FA0D6]/10" : ""
                          }`}
                        >
                          <p className="text-xs font-bold text-white truncate">{n.title}</p>
                          <p className="text-[11px] font-medium text-[#97A0B3] mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* User Avatar Hover Dropdown */}
          <div className="relative group">
            <Link
              to="/portal/account"
              className="w-10 h-10 rounded-full bg-[#BCCCE6] text-[#0B111C] font-bold flex items-center justify-center text-sm shadow-sm hover:scale-105 hover:shadow-md hover:ring-2 hover:ring-[#7FA0D6]/40 active:scale-95 transition-all block"
              aria-label="User profile"
            >
              {userInitial}
            </Link>

            {/* CSS Hover Menu for Profile */}
            <div className="absolute right-0 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[150]">
              <div className="w-64 bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-[0_12px_40px_rgba(5,8,16,0.8)] p-2">
                <div className="px-4 py-3 border-b border-[#2A3446] mb-2">
                  <p className="text-sm font-bold text-white truncate">{user?.full_name || "User"}</p>
                  <p className="text-xs font-medium text-[#97A0B3] truncate mt-0.5">{user?.email || ""}</p>
                </div>
                
                <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-[#97A0B3]">Profile Sections</div>
                
                <Link
                  to="/portal/account?tab=business"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#97A0B3] hover:bg-[#0B111C] hover:text-white transition-colors"
                >
                  Company & Contact Info
                </Link>
                <Link
                  to="/portal/account?tab=brand"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#97A0B3] hover:bg-[#0B111C] hover:text-white transition-colors"
                >
                  Brand Profile
                </Link>
                <Link
                  to="/portal/account?tab=security"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#97A0B3] hover:bg-[#0B111C] hover:text-white transition-colors"
                >
                  Security
                </Link>
                <Link
                  to="/portal/account?tab=integrations"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#97A0B3] hover:bg-[#0B111C] hover:text-white transition-colors"
                >
                  Social Integrations
                </Link>
                
                <div className="my-1.5 border-t border-[#2A3446] mx-2"></div>

                {user?.role && user.role !== "client" && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#97A0B3] hover:bg-[#0B111C] hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#97A0B3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Admin Panel
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/30 transition-colors mt-0.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </header>
  );
}
