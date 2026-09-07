import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { Bell, Settings, LifeBuoy, LogOut, Building2, ExternalLink } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";

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

export function PortalHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useQuery<NotificationPayload>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      return await request<NotificationPayload>("/api/v1/notifications");
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const unreadCount = notifData?.unread_count || 0;
  const notifications = notifData?.items || [];

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
      setNotificationOpen(false);
      navigate(item.link);
    }
  };

  const getPageTitle = () => {
    const pathname = location.pathname;
    if (!pathname || pathname === "/portal") {
      return "DASHBOARD";
    }
    if (pathname.startsWith("/portal/deliverables")) {
      return "DELIVERABLES";
    }
    if (pathname.startsWith("/portal/calendar")) {
      return "CALENDAR";
    }
    if (pathname.startsWith("/portal/payments")) {
      return "PAYMENTS";
    }
    if (pathname.startsWith("/portal/support")) {
      return "SUPPORT";
    }
    if (pathname.startsWith("/portal/account")) {
      return "ACCOUNT";
    }
    if (pathname.startsWith("/portal/addons")) {
      return "ADD-ONS";
    }
    const segment = pathname.split("/").filter(Boolean).pop() || "DASHBOARD";
    return segment.toUpperCase().replace(/-/g, " ");
  };

  const displayName = user?.full_name || "Partner";
  const initial = displayName.charAt(0).toUpperCase();
  const businessName = (user as any)?.business_name || "";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-white px-4 sm:px-8">
      {/* Dynamic Page Title */}
      <div className="flex items-center">
        <h1 className="text-sm font-semibold tracking-wider text-[#0D2137]">
          {getPageTitle()}
        </h1>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Role Switcher if Admin/Staff */}
        {user && ["admin", "super_admin", "team_lead"].includes(user.role) && (
          <button
            type="button"
            onClick={() => navigate("/admin/clients")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
          >
            <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />
            Switch to Admin Ops ↗
          </button>
        )}

        {/* Notification Bell with Live Unread Badge */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationOpen(!notificationOpen);
              setDropdownOpen(false);
            }}
            className="relative flex size-9 items-center justify-center rounded-lg text-[#0D2137]/70 hover:bg-slate-100 hover:text-[#0D2137] transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-84 rounded-2xl border border-border bg-white p-4 shadow-xl z-50 text-[#0D2137] space-y-3 animate-[zoomIn_0.1s_ease-out]">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2B7BC4]">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-[#2B7BC4]">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-slate-500 hover:text-[#2B7BC4] cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className={`rounded-xl p-3 text-xs space-y-1 cursor-pointer transition-all border ${
                        !n.is_read
                          ? "bg-[#E8F4FD]/70 border-[#C9DFF0] hover:bg-[#E8F4FD]"
                          : "bg-slate-50/70 border-slate-100 hover:bg-slate-100 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-bold truncate ${!n.is_read ? "text-[#0D2137]" : "text-slate-700"}`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="size-2 rounded-full bg-[#2B7BC4] shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      {n.link && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2B7BC4]">
                          View details <ExternalLink className="size-2.5" />
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setNotificationOpen(false);
            }}
            className="flex size-9 items-center justify-center rounded-full bg-[#2B7BC4] text-white text-sm font-semibold outline-hidden focus-visible:ring-2 focus-visible:ring-[#2B7BC4] focus-visible:ring-offset-2 cursor-pointer shadow-xs"
          >
            {initial}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-white p-2 shadow-lg z-50 text-[#0D2137]">
              <div className="px-3 py-2 border-b border-border mb-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#2B7BC4] text-white text-xs font-semibold">
                    {initial}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-[#0D2137] truncate">{displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email ?? ""}</p>
                  </div>
                </div>
                {businessName && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Building2 className="size-3.5 shrink-0" />
                    <span className="truncate">{businessName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/portal/account");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-[#E8F4FD] hover:text-[#2B7BC4] rounded-lg transition-colors text-left cursor-pointer"
                >
                  <Settings className="size-4" />
                  Account Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/portal/support");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-[#E8F4FD] hover:text-[#2B7BC4] rounded-lg transition-colors text-left cursor-pointer"
                >
                  <LifeBuoy className="size-4" />
                  Help & Support
                </button>
                <div className="border-t border-border my-1" />
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <LogOut className="size-4" />
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
