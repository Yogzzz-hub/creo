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
  
  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
      <div className="flex items-center justify-between px-6 max-w-[1600px] mx-auto h-16 w-full bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 pointer-events-auto">
        {/* Mobile Left: Logo & Page Title */}
        <div className="flex-1 flex items-center xl:hidden gap-3 min-w-0 pr-2">
          <Link to="/portal" className="flex items-center hover:scale-105 hover:drop-shadow-sm transition-all shrink-0">
            <span className="text-[20px] font-black tracking-tighter text-slate-900">creo<span className="text-[#0052FF]">.</span></span>
          </Link>
          <div className="w-[1px] h-4 bg-slate-200 shrink-0"></div>
          <h1 className="text-[15px] sm:text-[16px] font-black tracking-tight text-slate-900 truncate">
            {getPageName(location.pathname, true)}
          </h1>
        </div>

        {/* Desktop Left: Page Title */}
        <div className="flex-1 shrink-0 hidden xl:flex items-center">
          <h1 className="text-[17px] font-black tracking-tight text-slate-900">
            {getPageName(location.pathname)}
          </h1>
        </div>

        {/* Center: Nav Pill (Desktop Only) */}
        <div className="hidden xl:flex absolute left-1/2 -translate-x-1/2 items-center justify-center pointer-events-none">
          
          {/* Desktop Center: Nav Pill */}
          <nav className="bg-[#F8F9FC] rounded-full p-1.5 hidden xl:flex items-center gap-1 border border-slate-100/60 pointer-events-auto">
            <Link
              to="/portal"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname === "/portal" || location.pathname === "/portal/"
                  ? "bg-white text-[#0D2137] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  : "text-slate-500 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/portal/payments"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname.includes("/payments")
                  ? "bg-white text-[#0D2137] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  : "text-slate-500 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Plans
            </Link>
            <Link
              to="/portal/creative-pod"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname.includes("/creative-pod")
                  ? "bg-white text-[#0D2137] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  : "text-slate-500 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Creative Pod
            </Link>

            {/* Logo in the middle */}
            <Link to="/portal" className="px-4 py-1 flex items-center hover:scale-105 hover:drop-shadow-sm transition-all">
              <span className="text-[20px] font-black tracking-tighter text-slate-900">creo<span className="text-[#0052FF]">.</span></span>
            </Link>

            <Link
              to="/portal/calendar"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname.includes("/calendar")
                  ? "bg-white text-[#0D2137] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  : "text-slate-500 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Calendar
            </Link>
            <Link
              to="/portal/deliverables"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname.includes("/deliverables")
                  ? "bg-white text-[#0D2137] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  : "text-slate-500 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Deliverables
            </Link>
            <Link
              to="/portal/support"
              className={`transition-all px-4 py-2 text-[13px] font-semibold rounded-full ${
                location.pathname.includes("/support")
                  ? "bg-white text-[#0D2137] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  : "text-slate-500 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              }`}
            >
              Support
            </Link>
          </nav>
        </div>

        {/* Right: Utilities */}
        <div className="flex-1 flex items-center justify-end gap-3">
          
          {/* Mobile hamburger */}
          <button
            type="button"
            className="xl:hidden p-1 text-slate-500 hover:text-slate-700 transition"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>

          {/* Notifications */}
          <div className="relative group">
            <button
              type="button"
              className="w-10 h-10 rounded-full border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:border-[#0052FF]/30 hover:scale-105 active:scale-95 transition-all relative shadow-xs"
              aria-label="Notifications"
              onClick={() => setNotificationOpen(!notificationOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0052FF] text-[10px] font-bold text-white border-2 border-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown (Click activated to mark read) */}
            {notificationOpen && (
              <div className="absolute right-0 top-full pt-4 z-[150] animate-scale-up" ref={bellRef as any}>
                <div className="w-80 bg-white rounded-3xl border border-slate-200/80 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-bold text-[#0052FF] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs font-medium text-slate-500">No new notifications</div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleItemClick(n)}
                          className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0 ${
                            !n.is_read ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                          <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Settings Icon */}
          <Link
            to="/portal/account"
            className="w-10 h-10 hidden xl:flex items-center justify-center text-slate-400 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:scale-105 active:scale-95 rounded-full transition-all"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>

          {/* User Avatar Hover Dropdown */}
          <div className="relative group">
            <Link
              to="/portal/account"
              className="w-10 h-10 rounded-full bg-[#0052FF] text-white font-bold flex items-center justify-center text-sm shadow-sm hover:scale-105 hover:shadow-md hover:ring-2 hover:ring-[#0052FF]/30 active:scale-95 transition-all block"
              aria-label="User profile"
            >
              {userInitial}
            </Link>

            {/* CSS Hover Menu for Profile */}
            <div className="absolute right-0 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[150]">
              <div className="w-64 bg-white rounded-3xl border border-slate-200/80 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-2">
                <div className="px-4 py-3 border-b border-slate-100 mb-2">
                  <p className="text-sm font-bold text-slate-900 truncate">{user?.full_name || "User"}</p>
                  <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{user?.email || ""}</p>
                </div>
                
                <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Profile Sections</div>
                
                <Link
                  to="/portal/account?tab=business"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Company & Contact Info
                </Link>
                <Link
                  to="/portal/account?tab=brand"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Brand Profile
                </Link>
                <Link
                  to="/portal/account?tab=security"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Security
                </Link>
                <Link
                  to="/portal/account?tab=integrations"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Social Integrations
                </Link>
                
                <div className="my-1.5 border-t border-slate-100 mx-2"></div>

                {user?.role && user.role !== "client" && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Admin Panel
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors mt-0.5"
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

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto absolute top-[70px] inset-x-0 xl:hidden bg-white border border-slate-200/80 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-4 space-y-1.5 animate-scale-up z-[150]">
          <Link
            to="/portal"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-5 py-3.5 rounded-2xl text-[15px] font-bold transition-colors ${
              location.pathname === "/portal" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/portal/payments"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-5 py-3.5 rounded-2xl text-[15px] font-bold transition-colors ${
              location.pathname.includes("/payments") ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Plans
          </Link>
          <Link
            to="/portal/creative-pod"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-5 py-3.5 rounded-2xl text-[15px] font-bold transition-colors ${
              location.pathname.includes("/creative-pod") ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Creative Pod
          </Link>
          <Link
            to="/portal/calendar"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-5 py-3.5 rounded-2xl text-[15px] font-bold transition-colors ${
              location.pathname.includes("/calendar") ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Calendar
          </Link>
          <Link
            to="/portal/deliverables"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-5 py-3.5 rounded-2xl text-[15px] font-bold transition-colors ${
              location.pathname.includes("/deliverables") ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Deliverables
          </Link>
          <Link
            to="/portal/support"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-5 py-3.5 rounded-2xl text-[15px] font-bold transition-colors ${
              location.pathname.includes("/support") ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Support
          </Link>
        </div>
      )}
    </header>
  );
}
