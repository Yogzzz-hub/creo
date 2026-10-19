import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Send,
  MessageSquare,
  Settings,
  LogOut,
  X,
  FileCheck,
  Home,
  CalendarDays,
  ListTodo,
  Building2,
  CalendarCheck,
  LifeBuoy,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";
import { useAdminSidebar } from "../admin/AdminSidebarContext";
import { useQuery } from "@tanstack/react-query";
import { fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import { NotificationMenu } from "../ui/NotificationMenu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

function isPathActive(href: string, pathname: string) {
  if (href === "/workstation") {
    return (
      pathname === "/workstation" ||
      pathname === "/workstation/" ||
      pathname === "/workstation/overview" ||
      pathname === "/member" ||
      pathname === "/member/overview"
    );
  }
  if (href === "/admin/pod-dashboard") {
    return (
      pathname === "/admin/pod-dashboard" ||
      pathname === "/admin/pod" ||
      pathname === "/lead/dashboard" ||
      pathname === "/lead" ||
      pathname === "/pod-lead" ||
      pathname === "/team-lead/dashboard" ||
      pathname === "/team-lead"
    );
  }
  if (href === "/lead/deliverables") {
    return (
      pathname === "/lead/deliverables" ||
      pathname === "/team-lead/deliverables" ||
      pathname.startsWith("/lead/deliverables/")
    );
  }
  if (href === "/lead/tasks") {
    return (
      pathname === "/lead/tasks" ||
      pathname === "/team-lead/tasks" ||
      pathname.startsWith("/lead/tasks/") ||
      pathname === "/freelance-management"
    );
  }
  if (href === "/lead/schedule") {
    return (
      pathname === "/lead/schedule" ||
      pathname === "/team-lead/schedule"
    );
  }
  if (href === "/lead/clients") {
    return (
      pathname === "/lead/clients" ||
      pathname === "/team-lead/clients" ||
      pathname.startsWith("/lead/clients/")
    );
  }
  if (href === "/slack" || href === "/workstation/slack") {
    return (
      pathname === "/slack" ||
      pathname.startsWith("/slack/") ||
      pathname === "/workstation/slack" ||
      pathname === "/workstation/chat" ||
      pathname === "/admin/slack"
    );
  }
  if (href === "/admin/publishing") {
    return (
      pathname === "/admin/publishing" ||
      pathname === "/workstation/publishing" ||
      pathname === "/member/publishing" ||
      pathname === "/lead/publishing"
    );
  }
  if (href === "/admin/calendar") {
    return (
      pathname === "/admin/calendar" ||
      pathname.startsWith("/admin/calendar/")
    );
  }
  if (href === "/admin/support") {
    return (
      pathname === "/admin/support" ||
      pathname.startsWith("/admin/support/tickets")
    );
  }
  if (href === "/workstation/settings") {
    return (
      pathname === "/workstation/settings" ||
      pathname === "/admin/settings"
    );
  }
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

const SECTIONS: NavSection[] = [
  {
    label: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/workstation", icon: LayoutDashboard },
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      { label: "Tasks", href: "/workstation/tasks", icon: CheckSquare },
      { label: "Instagram Publishing", href: "/admin/publishing", icon: Send },
      { label: "Leave Requests", href: "/workstation/schedule", icon: Calendar },
      { label: "Workspace Hub", href: "/workstation/slack", icon: MessageSquare, badge: "Chat" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Settings", href: "/workstation/settings", icon: Settings },
    ],
  },
];

export function WorkstationSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mobileOpen, setMobileOpen } = useAdminSidebar();
  const confirm = useConfirm();
  const [loggingOut, setLoggingOut] = useState(false);

  // Live query for pod metadata (pod name, member info, tasks)
  const { data: podData } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 30_000,
    enabled: !!user?.id,
  });


  // Calculate tasks due today for mobile tasks item badge
  const isTeamLead =
    user?.role === "team_lead" ||
    user?.role === "lead" ||
    location.pathname.startsWith("/lead") ||
    location.pathname.startsWith("/team-lead") ||
    location.pathname === "/admin/pod-dashboard" ||
    location.pathname === "/admin/pod";
  const allTasks = Object.values(podData?.tasks ?? {}).flat();
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueTodayTasks = allTasks.filter(
    (t) => t.assigned_to === user?.id && t.due_date && t.due_date.startsWith(todayStr) && t.status !== "completed"
  );
  const dueTodayCount = dueTodayTasks.length;
  const pendingReviewCount =
    podData?.pod?.stats?.internal_qa ??
    podData?.tasks?.internal_qa?.length ??
    0;

  const leadNavSections: NavSection[] = [
    {
      label: "",
      items: [
        { label: "Home", href: "/admin/pod-dashboard", icon: Home },
        {
          label: "Review",
          href: "/lead/deliverables",
          icon: FileCheck,
          badge: pendingReviewCount > 0 ? String(pendingReviewCount) : undefined,
        },
        { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
        { label: "Task Queue", href: "/lead/tasks", icon: ListTodo },
      ],
    },
    {
      label: "TEAM & CLIENTS",
      items: [
        { label: "Client Allocations", href: "/lead/clients", icon: Building2 },
        { label: "Leave & Schedule", href: "/lead/schedule", icon: CalendarCheck },
        { label: "Instagram Publishing", href: "/admin/publishing", icon: Send },
      ],
    },
    {
      label: "OPERATIONS",
      items: [
        { label: "Slack Chat", href: "/slack", icon: MessageSquare, badge: "Chat" },
        { label: "Support Desk", href: "/admin/support", icon: LifeBuoy },
      ],
    },
    {
      label: "ACCOUNT",
      items: [
        { label: "Settings", href: "/workstation/settings", icon: Settings },
      ],
    },
  ];

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search, setMobileOpen]);

  // Handle Escape key and body scroll lock on mobile
  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen, setMobileOpen]);

  // Ensure body scroll is unlocked when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function handleLogout() {
    const ok = await confirm({
      title: "Log out of Creo?",
      description: "You will need to sign in again to access your workstation.",
      confirmText: "Log out",
      cancelText: "Stay signed in",
      tone: "warning",
      icon: "logout",
    });
    if (!ok) return;

    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // Continue navigation even if server session expired
    } finally {
      setLoggingOut(false);
    }
    navigate("/auth");
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[9998] bg-[#050810]/75 backdrop-blur-sm lg:hidden cursor-pointer"
        />
      )}

      {/* Sidebar Container: Desktop (unchanged) + Mobile Drawer (reference design) */}
      <aside
        aria-label="Workstation navigation sidebar"
        className={`fixed inset-y-0 left-0 z-[9999] lg:z-30 flex w-[280px] max-w-[85vw] flex-col shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0 visible pointer-events-auto"
            : "-translate-x-full invisible lg:visible pointer-events-none lg:pointer-events-auto"
        } bg-[#161F2D] border-r border-[#2A3446] max-h-screen`}
      >
        {/* ========================================================================= */}
        {/* 1. DESKTOP SIDEBAR VIEW (lg:flex, hidden on mobile) - 100% UNCHANGED      */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex flex-col h-full w-full bg-[#161F2D]">
          {/* Brand Header */}
          <div className="p-4 sm:p-5 border-b border-[#2A3446] flex items-center justify-between bg-[#0B111C]/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <Link to="/workstation" className="text-xl font-black text-white tracking-tighter flex items-center">
                creo<span className="text-[#7FA0D6] text-2xl leading-none">.</span>
              </Link>
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                TEAM MEMBER
              </span>
            </div>
            {/* Desktop Notification Menu next to Team Member badge */}
            <NotificationMenu placement="sidebar" />
          </div>

          {/* Scrollable Navigation */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-5 text-left [scrollbar-width:thin] [scrollbar-color:#2A3446_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2A3446] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#7FA0D6]/50">
            {SECTIONS.map((section) => (
              <div key={section.label} className="space-y-1.5">
                <div className="px-3 pb-1 text-xs font-black uppercase tracking-wider text-[#7FA0D6]">
                  {section.label}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isPathActive(item.href, location.pathname);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold transition-all ${
                          active
                            ? "bg-[#BCCCE6] text-[#0B111C] shadow-sm font-black"
                            : "text-[#97A0B3] hover:text-white hover:bg-[#0B111C]/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            className={`w-[18px] h-[18px] shrink-0 ${
                              active ? "text-[#0B111C]" : "text-[#7FA0D6]"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                              active
                                ? "bg-[#0B111C]/20 text-[#0B111C]"
                                : "bg-[#7FA0D6]/20 text-[#7FA0D6]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}

                  {/* Direct Log out action in ACCOUNT section */}
                  {section.label === "ACCOUNT" && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C]/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <LogOut className="w-[18px] h-[18px] shrink-0 text-[#7FA0D6]" />
                        <span className="truncate">{loggingOut ? "Signing out..." : "Log out"}</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Admin Escape Hatch for staff / admin roles */}
          {(user?.role === "admin" || user?.role === "super_admin") && (
            <div className="p-3 border-t border-[#2A3446] bg-[#0B111C]/80 shrink-0 text-left">
              <Link
                to="/admin"
                className="w-full flex items-center justify-between text-xs font-bold text-[#7FA0D6] hover:text-white px-3 py-2 rounded-xl bg-[#0B111C] border border-[#7FA0D6]/30 hover:border-[#7FA0D6]/60 transition-colors shadow-xs"
              >
                <span>← Return to Admin Console</span>
                <LayoutDashboard className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. MOBILE DRAWER SIDEBAR VIEW (lg:hidden) - EXACT REFERENCE DESIGN        */}
        {/* ========================================================================= */}
        <div className="lg:hidden flex flex-col h-full max-h-screen w-full bg-[#161F2D] text-left overflow-y-auto overscroll-contain [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
          {isTeamLead ? (
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between min-h-full">
              <div className="space-y-5">
                {/* Brand Header */}
                <div className="pb-4 border-b border-[#2A3446] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Link
                      to="/admin/pod-dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="text-xl font-black text-white tracking-tighter"
                    >
                      creo<span className="text-[#7FA0D6] text-2xl leading-none">.</span>
                    </Link>
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                      POD LEAD
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="size-8 rounded-xl flex items-center justify-center text-[#97A0B3] hover:text-white hover:bg-[#161F2D] border border-transparent hover:border-[#2A3446] transition-colors cursor-pointer"
                    aria-label="Close navigation sidebar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 11 Tabs with Section Titles matching Reference Design */}
                <div className="space-y-5">
                  {leadNavSections.map((section, idx) => (
                    <div key={section.label || `lead-sec-${idx}`} className="space-y-1.5">
                      {section.label && (
                        <div className="px-3 pb-1 text-xs font-black uppercase tracking-wider text-[#7FA0D6]">
                          {section.label}
                        </div>
                      )}
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const active = isPathActive(item.href, location.pathname);
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold transition-all ${
                                active
                                  ? "bg-[#BCCCE6] text-[#0B111C] shadow-sm font-black"
                                  : "text-[#97A0B3] hover:text-white hover:bg-[#0B111C]/50"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Icon
                                  className={`w-[18px] h-[18px] shrink-0 ${
                                    active ? "text-[#0B111C]" : "text-[#7FA0D6]"
                                  }`}
                                />
                                <span className="truncate">{item.label}</span>
                              </div>
                              {item.badge && (
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                                    active
                                      ? "bg-[#0B111C]/20 text-[#0B111C]"
                                      : "bg-[#7FA0D6]/20 text-[#7FA0D6]"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}

                        {/* Direct Log out action in ACCOUNT section */}
                        {section.label.toUpperCase() === "ACCOUNT" && (
                          <button
                            type="button"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C]/50 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <LogOut className="w-[18px] h-[18px] shrink-0 text-[#7FA0D6]" />
                              <span className="truncate">{loggingOut ? "Signing out..." : "Log out"}</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between min-h-full">
              <div className="space-y-5">
                {/* Brand Header */}
                <div className="pb-4 border-b border-[#2A3446] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Link
                      to="/workstation"
                      onClick={() => setMobileOpen(false)}
                      className="text-xl font-black text-white tracking-tighter"
                    >
                      creo<span className="text-[#7FA0D6] text-2xl leading-none">.</span>
                    </Link>
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                      MEMBER
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="size-8 rounded-xl flex items-center justify-center text-[#97A0B3] hover:text-white hover:bg-[#161F2D] border border-transparent hover:border-[#2A3446] transition-colors cursor-pointer"
                    aria-label="Close navigation sidebar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Exact Desktop Tab Names & Categorized Sections matching Team Lead Portal */}
                <div className="space-y-5">
                  {SECTIONS.map((section, idx) => (
                    <div key={section.label || `member-sec-${idx}`} className="space-y-1.5">
                      {section.label && (
                        <div className="px-3 pb-1 text-xs font-black uppercase tracking-wider text-[#7FA0D6]">
                          {section.label}
                        </div>
                      )}
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const active = isPathActive(item.href, location.pathname);
                          const Icon = item.icon;
                          const badge = item.label === "Tasks" && dueTodayCount > 0 ? String(dueTodayCount) : item.badge;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold transition-all ${
                                active
                                  ? "bg-[#BCCCE6] text-[#0B111C] shadow-sm font-black"
                                  : "text-[#97A0B3] hover:text-white hover:bg-[#0B111C]/50"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Icon
                                  className={`w-[18px] h-[18px] shrink-0 ${
                                    active ? "text-[#0B111C]" : "text-[#7FA0D6]"
                                  }`}
                                />
                                <span className="truncate">{item.label}</span>
                              </div>
                              {badge && (
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                                    active
                                      ? "bg-[#0B111C]/20 text-[#0B111C]"
                                      : "bg-[#7FA0D6]/20 text-[#7FA0D6]"
                                  }`}
                                >
                                  {badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}

                        {/* Direct Log out action in ACCOUNT section */}
                        {section.label.toUpperCase() === "ACCOUNT" && (
                          <button
                            type="button"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C]/50 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <LogOut className="w-[18px] h-[18px] shrink-0 text-[#7FA0D6]" />
                              <span className="truncate">{loggingOut ? "Signing out..." : "Log out"}</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Return to Admin Console if admin/super_admin */}
                  {(user?.role === "admin" || user?.role === "super_admin") && (
                    <div className="pt-2">
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="w-full flex items-center justify-between text-xs font-bold text-[#7FA0D6] hover:text-white px-3 py-2 rounded-xl bg-[#0B111C] border border-[#7FA0D6]/30 hover:border-[#7FA0D6]/60 transition-colors shadow-xs"
                      >
                        <span>← Return to Admin Console</span>
                        <LayoutDashboard className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
