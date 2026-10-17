import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, CalendarCheck, DollarSign, Users, Clock, ExternalLink, ShieldCheck, Trash2, X } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string;
  created_at?: string;
  type?: "leave" | "revenue" | "team" | "system";
  is_read?: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [];

export function NotificationMenu({ placement = "header" }: { placement?: "header" | "sidebar" }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSalesRole = user?.role === "sales" || location.pathname.startsWith("/bde");
  const isFreelancerRole = user?.role === "freelancer" || location.pathname.startsWith("/freelancer");

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setNotificationOpen(false); }, [location.pathname]);
  useEffect(() => {
    const closeOnResize = () => setNotificationOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationOpen(false);
        if (panelRef.current?.contains(document.activeElement)) notifRef.current?.querySelector("button")?.focus();
      }
    };
    window.addEventListener("resize", closeOnResize);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", closeOnResize);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const { data: serverNotifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["admin-notifications", user?.id],
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
    enabled: !!user?.id,
    staleTime: 30_000,
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
      if (isSalesRole) {
        if (n.link?.includes("/admin/leaves") || n.link?.includes("/admin/leave")) {
          return { ...n, is_read: isRead, link: "/bde/leave" };
        }
      }
      if (isFreelancerRole) {
        if (n.link?.includes("/admin/leaves") || n.link?.includes("/admin/leave")) {
          return { ...n, is_read: isRead, link: "/freelancer/leave" };
        }
      }
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
      if (notifRef.current && !notifRef.current.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) {
        setNotificationOpen(false);
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
      queryClient.invalidateQueries({ queryKey: ["admin-notifications", user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-notifications", user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-notifications", user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-notifications", user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-notifications", user?.id] });
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

  return (
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              title="Notifications"
              onClick={() => setNotificationOpen(!notificationOpen)}
              className={`size-8 sm:size-8.5 rounded-full flex items-center justify-center transition-all relative cursor-pointer ${
                notificationOpen
                  ? "bg-[#0B111C] text-white shadow-sm border border-[#7FA0D6]/60"
                  : placement === "header"
                  ? "text-[#97A0B3] hover:text-white bg-[#0B111C]/50 hover:bg-[#0B111C] border border-[#2A3446]/80 hover:border-[#7FA0D6]/40 shadow-2xs"
                  : "text-[#97A0B3] hover:text-white hover:bg-white/[0.06]"
              }`}
              aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
              aria-expanded={notificationOpen}
              aria-controls={notificationOpen ? "notification-menu-panel" : undefined}
            >
              <Bell className="size-4 sm:size-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-3.5 sm:size-4 bg-[#7FA0D6] text-[#0B111C] rounded-full text-[9px] sm:text-[10px] font-black flex items-center justify-center border border-[#161F2D] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notificationOpen && createPortal(
              <div ref={panelRef} id="notification-menu-panel" role="dialog" aria-label="Notifications" className={`fixed z-[10000] flex flex-col w-[min(400px,calc(100vw-2rem))] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-[#334155] bg-[#161F2D] text-left shadow-[0_24px_80px_rgba(0,0,0,0.5)] animate-scale-up ${placement === "sidebar" ? "right-4 top-16 lg:right-auto lg:left-[292px] lg:top-4" : "right-4 top-16 sm:right-6"}`}>
                {/* Header */}
                <div className="px-4 sm:px-5 py-4 border-b border-[#2A3446] flex items-start justify-between gap-3 bg-[#101724] shrink-0">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold tracking-tight text-[#F8FAFC]">Notifications</h3>
                    {unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30">
                        {unreadCount} unread
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7FA0D6]/20 bg-[#7FA0D6]/10 px-2 py-0.5 text-[11px] font-medium text-[#BCCCE6]">
                        <CheckCheck className="size-3" /> All caught up
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
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
                    <button
                      type="button"
                      aria-label="Close notifications"
                      onClick={() => {
                        setNotificationOpen(false);
                        notifRef.current?.querySelector("button")?.focus();
                      }}
                      className="flex size-8 items-center justify-center rounded-lg text-[#97A0B3] hover:bg-[#2A3446] hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6]"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Notification Items List */}
                <div className="min-h-0 max-h-[340px] sm:max-h-[380px] overflow-y-auto divide-y divide-[#2A3446] scrollbar-thin">
                  {notificationsList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 sm:p-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-[#223047] group relative ${
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
                          <h4 className={`text-sm leading-5 ${!item.is_read ? "font-bold text-white" : "font-medium text-[#F1F5F9]"}`}>
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

                        <p className="text-xs text-[#A7B4C8] line-clamp-2 leading-relaxed">
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
                    <div className="px-6 py-9 text-center">
                      <div className="relative mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-[#7FA0D6]/20 bg-[#7FA0D6]/10">
                        <Bell className="size-7 text-[#BCCCE6]" />
                        <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-[#161F2D] bg-[#7FA0D6] text-[#0B111C]"><Check className="size-3.5" /></span>
                      </div>
                      <p className="text-base font-semibold text-[#F8FAFC]">You're all caught up</p>
                      <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-[#A7B4C8]">New updates from your workspace will appear here.</p>
                    </div>
                  )}
                </div>
              </div>, document.body
            )}
          </div>
  );
}
