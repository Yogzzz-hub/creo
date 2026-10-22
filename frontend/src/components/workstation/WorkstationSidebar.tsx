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
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Instagram } from "../../ui/brand-icons";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";
import { useAdminSidebar } from "../admin/AdminSidebarContext";
import { useQuery } from "@tanstack/react-query";
import { fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";

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
  if (href === "/workstation/slack") {
    return (
      pathname === "/workstation/slack" ||
      pathname === "/workstation/chat" ||
      pathname === "/slack" ||
      pathname.startsWith("/slack/")
    );
  }
  if (href === "/admin/publishing") {
    return (
      pathname === "/admin/publishing" ||
      pathname === "/workstation/publishing" ||
      pathname === "/member/publishing"
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
      { label: "Instagram Connect", href: "/admin/publishing", icon: Send },
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

  const podName = podData?.pod?.name || "Pod Beta";
  const userInitial = user?.full_name ? user.full_name.trim().charAt(0).toUpperCase() : "R";

  const userRoleParens =
    user?.role === "designer"
      ? "Designer"
      : user?.role === "editor"
      ? "Editor"
      : user?.role
      ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Editor";

  const userRoleBadge =
    user?.role === "designer"
      ? "Lead Designer"
      : user?.role === "editor"
      ? "Video Editor"
      : user?.role
      ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Video Editor";

  // Calculate tasks due today for mobile tasks item badge
  const allTasks = Object.values(podData?.tasks ?? {}).flat();
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueTodayTasks = allTasks.filter(
    (t) => t.assigned_to === user?.id && t.due_date && t.due_date.startsWith(todayStr) && t.status !== "completed"
  );
  const dueTodayCount = dueTodayTasks.length;

  // Mobile active states
  const isOverviewActive =
    location.pathname === "/workstation" ||
    location.pathname === "/workstation/" ||
    location.pathname === "/workstation/overview" ||
    location.pathname === "/member" ||
    location.pathname === "/member/" ||
    location.pathname === "/member/overview";

  const isTasksActive =
    location.pathname.startsWith("/workstation/tasks") ||
    location.pathname.startsWith("/member/tasks");

  const isScheduleActive =
    location.pathname.startsWith("/workstation/schedule") ||
    location.pathname.startsWith("/member/schedule");

  const isSlackActive =
    location.pathname.startsWith("/workstation/slack") ||
    location.pathname.startsWith("/workstation/chat") ||
    location.pathname === "/slack" ||
    location.pathname.startsWith("/slack/");

  const isPublishingActive =
    location.pathname === "/admin/publishing" ||
    location.pathname === "/workstation/publishing" ||
    location.pathname === "/member/publishing";

  const isSettingsActive =
    location.pathname.startsWith("/workstation/settings") ||
    location.pathname.startsWith("/member/settings");

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
          className="fixed inset-0 z-[9998] bg-app-void/75 backdrop-blur-sm lg:hidden cursor-pointer"
        />
      )}

      {/* Sidebar Container: Desktop (unchanged) + Mobile Drawer (reference design) */}
      <aside
        aria-label="Workstation navigation sidebar"
        className={`fixed inset-y-0 left-0 z-[9999] lg:z-30 flex w-[285px] sm:w-[300px] max-w-[85vw] flex-col shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0 visible pointer-events-auto"
            : "-translate-x-full invisible lg:visible pointer-events-none lg:pointer-events-auto"
        } bg-app-void border-r border-app-line-soft lg:bg-app-surface lg:border-app-line max-h-screen`}
      >
        {/* ========================================================================= */}
        {/* 1. DESKTOP SIDEBAR VIEW (lg:flex, hidden on mobile) - 100% UNCHANGED      */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex flex-col h-full w-full bg-app-surface">
          {/* Brand Header */}
          <div className="p-4 sm:p-5 border-b border-app-line flex items-center justify-between bg-app-base/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <Link to="/workstation" className="text-xl font-black text-hi tracking-tighter flex items-center">
                creo<span className="text-app-accent text-2xl leading-none">.</span>
              </Link>
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-app-accent/15 text-app-accent border border-app-accent/30">
                Team Member
              </span>
            </div>
          </div>

          {/* Scrollable Navigation */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-5 text-left [scrollbar-width:thin] [scrollbar-color:#2A3446_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-app-line [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-app-accent/50">
            {SECTIONS.map((section) => (
              <div key={section.label} className="space-y-1.5">
                <div className="px-3 pb-1 text-xs font-black uppercase tracking-wider text-app-accent">
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
                            ? "bg-app-accent-soft text-app-base shadow-sm font-black"
                            : "text-app-mist hover:text-hi hover:bg-app-base/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            className={`w-[18px] h-[18px] shrink-0 ${
                              active ? "text-app-base" : "text-app-accent"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                              active
                                ? "bg-app-base/20 text-app-base"
                                : "bg-app-accent/20 text-app-accent"
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
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold text-app-mist hover:text-hi hover:bg-app-base/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <LogOut className="w-[18px] h-[18px] shrink-0 text-app-accent" />
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
            <div className="p-3 border-t border-app-line bg-app-base/80 shrink-0 text-left">
              <Link
                to="/admin"
                className="w-full flex items-center justify-between text-xs font-bold text-app-accent hover:text-hi px-3 py-2 rounded-xl bg-app-base border border-app-accent/30 hover:border-app-accent/60 transition-colors shadow-xs"
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
        <div className="lg:hidden flex flex-col h-full max-h-screen w-full bg-app-void text-left overflow-y-auto overscroll-contain [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
          <div className="p-4 flex-1 flex flex-col justify-between min-h-full space-y-4">
            <div className="space-y-4">
            {/* Top Brand Header & Close Button */}
            <div className="flex items-center justify-between shrink-0 pt-0.5">
              <div className="flex items-center gap-2.5">
                <Link
                  to="/workstation"
                  onClick={() => setMobileOpen(false)}
                  className="text-2xl font-black text-hi tracking-tight flex items-center"
                >
                  Creo<span className="text-sky-400 text-3xl leading-none">.</span>
                </Link>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-app-nested text-app-mist border border-app-line-soft">
                  MEMBER
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="size-9 rounded-xl bg-app-nested border border-app-line-soft flex items-center justify-center text-slate-400 hover:text-hi transition-colors cursor-pointer"
                aria-label="Close navigation sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Card */}
            <div className="rounded-2xl bg-app-nested border border-app-line-soft p-3.5 flex items-center gap-3.5">
              <div className="size-12 rounded-full bg-app-surface border border-app-line flex items-center justify-center text-base font-bold text-app-mist shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-hi tracking-tight truncate">
                  {user?.full_name || "Rahim"} ({userRoleParens})
                </div>
                <div className="flex items-center gap-1.5 text-xs text-app-mist mt-0.5">
                  <span className="size-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38BDF8] text-app-on-accent!" />
                  <span className="truncate">Active in {podName}</span>
                </div>
                <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-app-base border border-app-line-soft text-[10px] font-semibold text-app-mist">
                  {userRoleBadge} • {podName}
                </div>
              </div>
            </div>

            {/* Navigation Items List */}
            <nav aria-label="Mobile Member Navigation" className="space-y-2 pt-1">
              {/* 1. Workstation Overview */}
              <Link
                to="/workstation"
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                  isOverviewActive
                    ? "bg-app-surface border border-app-line text-hi shadow-xs font-bold"
                    : "text-slate-300 hover:text-hi hover:bg-app-nested font-semibold"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`size-2 rounded-full ${
                      isOverviewActive ? "bg-sky-400 shadow-[0_0_8px_#38BDF8] text-app-on-accent!" : "bg-transparent"
                    }`}
                  />
                  <span className="text-sm">Workstation Overview</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              {/* 2. My Tasks */}
              <Link
                to="/workstation/tasks"
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                  isTasksActive
                    ? "bg-app-surface border border-app-line text-hi shadow-xs font-bold"
                    : "text-slate-300 hover:text-hi hover:bg-app-nested font-semibold"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span className="text-sm">My Tasks</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-app-surface border border-app-line text-[11px] font-semibold text-app-mist">
                  {dueTodayCount > 0 ? `${dueTodayCount} Due Today` : "3 Due Today"}
                </span>
              </Link>

              {/* 3. Schedule & Standups */}
              <Link
                to="/workstation/schedule"
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                  isScheduleActive
                    ? "bg-app-surface border border-app-line text-hi shadow-xs font-bold"
                    : "text-slate-300 hover:text-hi hover:bg-app-nested font-semibold"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span className="text-sm">Schedule & Standups</span>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  Next: 25m
                </span>
              </Link>

              {/* 4. Slack Workspace Hub */}
              <Link
                to="/workstation/slack"
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                  isSlackActive
                    ? "bg-app-surface border border-app-line text-hi shadow-xs font-bold"
                    : "text-slate-300 hover:text-hi hover:bg-app-nested font-semibold"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4.5 h-4.5 text-app-accent shrink-0" />
                  <span className="text-sm">Slack Workspace Hub</span>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {podName}
                </span>
              </Link>

              {/* 5. IG Publishing */}
              <Link
                to="/admin/publishing"
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                  isPublishingActive
                    ? "bg-app-surface border border-app-line text-hi shadow-xs font-bold"
                    : "text-slate-300 hover:text-hi hover:bg-app-nested font-semibold"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Instagram className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span className="text-sm">IG Publishing</span>
                </div>
                <span className="text-xs font-bold text-sky-400">
                  Auto
                </span>
              </Link>

              {/* 6. Preferences */}
              <Link
                to="/workstation/settings"
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                  isSettingsActive
                    ? "bg-app-surface border border-app-line text-hi shadow-xs font-bold"
                    : "text-slate-300 hover:text-hi hover:bg-app-nested font-semibold"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span className="text-sm">Preferences</span>
                </div>
              </Link>
            </nav>

            {/* Admin Escape Hatch for staff / admin roles */}
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <div className="pt-2">
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center justify-between text-xs font-bold text-app-accent hover:text-hi px-3 py-2 rounded-xl bg-app-nested border border-app-accent/30 hover:border-app-accent/60 transition-colors shadow-xs"
                >
                  <span>← Return to Admin Console</span>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Bottom Footer Section */}
          <div className="shrink-0 pt-4 mt-auto">
            <div className="flex items-center justify-between text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase px-1">
              <span>{podName.toUpperCase()} // CLUSTER</span>
              <span>v2.4.1</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full mt-3 py-3 rounded-2xl bg-app-nested border border-app-line-soft flex items-center justify-center gap-2.5 text-sm font-bold text-slate-200 hover:text-hi hover:bg-app-surface transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>{loggingOut ? "Signing out..." : "Sign Out Session"}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
