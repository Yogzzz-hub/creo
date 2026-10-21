import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import {
  FileCheck,
  CalendarDays,
  FolderOpen,
  Dna,
  CreditCard,
  HelpCircle,
  Settings,
  LogOut,
  X,
  MessageSquare,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";
import { useAdminSidebar } from "../admin/AdminSidebarContext";
import { ThemeToggle } from "../ui/ThemeToggle";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  id?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

function isActive(href: string, pathname: string, search: string) {
  const [path, query] = href.split("?");
  if (path === "/portal") return pathname === "/portal" || pathname === "/portal/";
  if (query) return pathname === path && new URLSearchParams(search).get("tab") === new URLSearchParams(query).get("tab");
  if (path === "/portal/account") return pathname === path && !new URLSearchParams(search).has("tab");
  return pathname === path || pathname.startsWith(path + "/");
}

export function PortalSidebarNew() {
  const location = useLocation();
  const { mobileOpen, setMobileOpen } = useAdminSidebar();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", escape);
    };
  }, [mobileOpen, setMobileOpen]);

  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const confirm = useConfirm();

  const clientId = user?.id;
  const { data: dashboardData } = useQuery({
    queryKey: ["portal-dashboard", clientId],
    queryFn: () => request<any>(`/api/v1/portal/dashboard?client_id=${clientId}`),
    staleTime: 60000,
    enabled: !!clientId && (user?.onboarding_stage ?? 0) >= 8,
  });

  const companyName = user?.company_name || user?.full_name || "Your Brand";
  const initials = companyName
    .split(" ")
    .filter((w: string) => w.length > 0)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    const ok = await confirm({
      title: "Sign Out?",
      description: "Are you sure you want to end your session?",
      confirmText: "Sign Out",
      cancelText: "Stay",
      tone: "warning",
      icon: "logout",
    });
    if (!ok) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  const sections: NavSection[] = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/portal", icon: LayoutDashboard, id: "dashboard" },
        {
          label: "Review",
          href: "/portal/deliverables",
          icon: FileCheck,
          id: "review",
          badge:
            dashboardData?.pending_deliverable_count > 0
              ? String(dashboardData.pending_deliverable_count)
              : undefined,
        },
        { label: "Calendar", href: "/portal/calendar", icon: CalendarDays, id: "calendar" },
        { label: "Library", href: "/portal/library", icon: FolderOpen, id: "library" },
      ],
    },
    {
      label: "Your Brand",
      items: [
        { label: "Workspace Hub", href: "/portal/slack", icon: MessageSquare, badge: "Chat" },
        { label: "Brand DNA", href: "/portal/brand", icon: Dna },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "Plan & billing", href: "/portal/payments", icon: CreditCard },
        { label: "Help", href: "/portal/support", icon: HelpCircle },
        { label: "Settings", href: "/portal/account", icon: Settings },
      ],
    },
  ];

  const planLabel = dashboardData?.active_plan?.tier
    ? `${dashboardData.active_plan.tier.charAt(0).toUpperCase()}${dashboardData.active_plan.tier.slice(1)} plan`
    : "Growth plan";

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[9998] bg-app-void/75 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        aria-label="Client navigation sidebar"
        className={`fixed inset-y-0 left-0 z-[9999] flex w-[280px] max-w-[85vw] flex-col border-r border-app-line/60 bg-app-base transition-transform duration-300 lg:z-40 lg:translate-x-0 ${
          mobileOpen ? "visible translate-x-0 shadow-2xl" : "invisible -translate-x-full lg:visible"
        }`}
      >
        {/* Wordmark */}
        <div className="flex shrink-0 items-start justify-between px-6 pb-6 pt-7">
          <div>
            <Link to="/portal" aria-label="Portal home" className="group flex items-baseline text-[1.6rem] font-black leading-none tracking-[-0.04em] text-hi">
              creo
              <span className="ml-[1px] inline-block size-[0.36em] rounded-full bg-[var(--portal-amber)] transition-transform duration-500 group-hover:-translate-y-1" />
            </Link>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-app-mist">Client portal</p>
          </div>
          {/* Phones get the toggle in the top header instead */}
          <div className="hidden lg:block">
            <ThemeToggle className="size-9 rounded-full" />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full text-app-mist transition-colors hover:bg-hi/[0.05] hover:text-hi lg:hidden"
            aria-label="Close navigation sidebar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Portal" className="min-h-0 flex-1 space-y-7 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-6 text-left [scrollbar-width:thin]">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-app-mist/80">{section.label}</div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href, location.pathname, location.search);
                  const Icon = item.icon;
                  const isCount = item.badge !== undefined && /^\d+$/.test(item.badge);
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between gap-3 rounded-full px-4 py-2.5 text-[15px] font-medium tracking-[-0.01em] transition-colors duration-200 ${
                          active ? "bg-app-ink text-app-base" : "text-app-mist hover:bg-hi/[0.04] hover:text-hi"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Icon className={`size-[18px] shrink-0 ${active ? "text-app-base" : ""}`} />
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.badge && (
                          <span
                            className={
                              isCount
                                ? "flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[var(--portal-amber)] px-1.5 text-xs font-bold text-[var(--portal-on-amber)]"
                                : `shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                    active ? "border-app-base/25 text-app-base" : "border-app-line text-app-mist"
                                  }`
                            }
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}

                {/* Direct Log out action in Account section */}
                {section.label === "Account" && (
                  <li>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-medium tracking-[-0.01em] text-app-mist transition-colors hover:bg-hi/[0.04] hover:text-hi"
                    >
                      <LogOut className="size-[18px] shrink-0" />
                      <span className="truncate">{loggingOut ? "Signing out..." : "Log out"}</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account */}
        <div className="shrink-0 space-y-3 border-t border-app-line/60 px-5 py-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--portal-amber)] text-xs font-bold text-[var(--portal-on-amber)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-hi">{companyName}</p>
              <p className="truncate text-xs text-app-mist">
                {planLabel} · Pod {dashboardData?.assigned_team?.length ? "assigned" : "pending"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-app-mist transition-colors hover:bg-app-warm/10 hover:text-app-warm"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>

          {/* Admin Escape Hatch for staff / admin roles */}
          {(user?.role === "admin" || user?.role === "super_admin") && (
            <Link
              to="/admin"
              className="flex w-full items-center justify-between rounded-full border-2 border-app-line px-4 py-2 text-sm font-semibold text-hi transition-colors hover:border-app-accent"
            >
              <span>Admin dashboard</span>
              <LayoutDashboard className="size-4 text-app-accent" />
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
