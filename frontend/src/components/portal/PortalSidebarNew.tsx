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

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[9998] bg-[#050810]/75 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        aria-label="Client navigation sidebar"
        className={`fixed inset-y-0 left-0 z-[9999] lg:z-40 flex w-[280px] max-w-[85vw] flex-col bg-[#161F2D] border-r border-[#2A3446] shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 visible" : "-translate-x-full invisible lg:visible"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-[#2A3446] flex items-center justify-between bg-[#0B111C]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Link to="/portal" className="text-xl font-black text-white tracking-tighter">
              creo<span className="text-[#7FA0D6] text-2xl leading-none">.</span>
            </Link>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
              Client Portal
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden size-8 rounded-xl flex items-center justify-center text-[#97A0B3] hover:text-white hover:bg-[#161F2D] border border-transparent hover:border-[#2A3446] transition-colors cursor-pointer"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 space-y-5 text-left [scrollbar-width:thin] [scrollbar-color:#2A3446_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2A3446] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#7FA0D6]/50">
          {sections.map((section) => (
            <div key={section.label} className="space-y-1.5">
              <div className="px-3 pb-1 text-xs font-black uppercase tracking-wider text-[#7FA0D6]">
                {section.label}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href, location.pathname, location.search);
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
                        <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-[#0B111C]" : "text-[#7FA0D6]"}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                            active ? "bg-[#0B111C]/20 text-[#0B111C]" : "bg-[#7FA0D6]/20 text-[#7FA0D6]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* Direct Log out action in Account section */}
                {section.label === "Account" && (
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
          <div className="p-3.5 border-t border-[#2A3446] bg-[#0B111C]/80 shrink-0 text-left">
            <Link
              to="/admin"
              className="w-full flex items-center justify-between text-xs font-bold text-[#7FA0D6] hover:text-white px-3 py-2 rounded-xl bg-[#0B111C] border border-[#7FA0D6]/30 hover:border-[#7FA0D6]/60 transition-colors shadow-xs"
            >
              <span>Admin Dashboard</span>
              <LayoutDashboard className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
