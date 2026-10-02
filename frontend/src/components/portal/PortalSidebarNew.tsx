import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import {
  Home,
  FileCheck,
  CalendarDays,
  FolderOpen,
  Users,
  Dna,
  CreditCard,
  HelpCircle,
  Settings,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";

/* ── Navigation Structure ── */
const MAIN_NAV = [
  { label: "Home", href: "/portal", icon: Home, id: "home" },
  { label: "Review", href: "/portal/deliverables", icon: FileCheck, id: "review" },
  { label: "Calendar", href: "/portal/calendar", icon: CalendarDays, id: "calendar" },
  { label: "Library", href: "/portal/library", icon: FolderOpen, id: "library" },
];

const BRAND_NAV = [
  { label: "Your pod", href: "/portal/creative-pod", icon: Users },
  { label: "Brand DNA", href: "/portal/account?tab=brand", icon: Dna },
];

const ACCOUNT_NAV = [
  { label: "Plan & billing", href: "/portal/payments", icon: CreditCard },
  { label: "Help", href: "/portal/support", icon: HelpCircle },
  { label: "Settings", href: "/portal/account", icon: Settings },
];

function isActive(href: string, pathname: string) {
  if (href === "/portal") return pathname === "/portal" || pathname === "/portal/";
  // For query-string links like ?tab=brand, match base path only
  const basePath = href.split("?")[0] || href;
  return pathname.startsWith(basePath) && href === basePath
    ? true
    : pathname + window.location.search === href;
}

/* ── Sidebar Component ── */
export function PortalSidebarNew() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const confirm = useConfirm();
  
  const clientId = user?.id || "00000000-0000-0000-0000-000000000001";
  const { data: dashboardData } = useQuery({
    queryKey: ["portal", "dashboard", clientId],
    queryFn: async () => {
      try {
        return await request<any>(`/api/v1/portal/dashboard?client_id=${clientId}`);
      } catch {
        return null;
      }
    },
    staleTime: 60000,
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

  return (
    <aside className="hidden xl:fixed xl:inset-y-0 xl:left-0 xl:z-40 xl:flex xl:w-[280px] xl:flex-col border-r border-white/[0.06]">
      <div className="flex flex-1 flex-col bg-[#0B111C] overflow-y-auto">
        {/* Logo */}
        <div className="px-7 pt-7 pb-2">
          <Link to="/portal" className="inline-flex items-center">
            <span className="text-[22px] font-extrabold tracking-tight text-white">
              Creo<span className="text-[#BCCCE6]">.</span>
            </span>
          </Link>
        </div>

        {/* Client Switcher Card */}
        <div className="mx-4 mt-4 mb-2">
          <div className="flex items-center gap-3 p-3 bg-[#161F2D] rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-[#7FA0D6] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{companyName}</p>
              <p className="text-[11px] text-[#97A0B3] truncate">
                {dashboardData?.active_plan?.tier ? dashboardData.active_plan.tier.charAt(0).toUpperCase() + dashboardData.active_plan.tier.slice(1) + " plan" : "Free"} · Pod {dashboardData?.assigned_team?.length ? "Assigned" : "Pending"}
              </p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col px-3 pt-2">
          {/* Main Links */}
          <div className="space-y-0.5">
            {MAIN_NAV.map((item) => {
              const active = isActive(item.href, location.pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`group flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-full transition-all duration-150 mx-1 ${
                    active
                      ? "bg-[#BCCCE6] text-[#0B111C] font-semibold"
                      : "text-[#97A0B3] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                  <span className="flex-1">{item.label}</span>
                  {item.id === "review" && dashboardData?.pending_deliverable_count > 0 && (
                    <span className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-[#7FA0D6] text-white text-[11px] font-bold">
                      {dashboardData.pending_deliverable_count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* YOUR BRAND Section */}
          <div className="mt-6">
            <p className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#97A0B3]">
              Your Brand
            </p>
            <div className="space-y-0.5">
              {BRAND_NAV.map((item) => {
                const active = isActive(item.href, location.pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`group flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-full transition-all duration-150 mx-1 ${
                      active
                        ? "bg-[#BCCCE6] text-[#0B111C] font-semibold"
                        : "text-[#97A0B3] hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ACCOUNT Section */}
          <div className="mt-6">
            <p className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#97A0B3]">
              Account
            </p>
            <div className="space-y-0.5">
              {ACCOUNT_NAV.map((item) => {
                const active = isActive(item.href, location.pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`group flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-full transition-all duration-150 mx-1 ${
                      active
                        ? "bg-[#BCCCE6] text-[#0B111C] font-semibold"
                        : "text-[#97A0B3] hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}

              {/* Logout */}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="group w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-full transition-all duration-150 mx-1 text-[#97A0B3] hover:text-white hover:bg-white/[0.04] cursor-pointer"
              >
                <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                <span className="flex-1 text-left">{loggingOut ? "Signing out..." : "Log out"}</span>
              </button>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer Card: Your Pod Lead */}
          {dashboardData?.assigned_team && dashboardData.assigned_team.length > 0 && (
            <div className="mx-1 mb-4 mt-4">
              <div className="p-4 bg-[#161F2D] rounded-xl border border-white/[0.05]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7FA0D6] to-[#7FA0D6] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {dashboardData.assigned_team[0].name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{dashboardData.assigned_team[0].name} <span className="text-[#97A0B3] font-normal">· {dashboardData.assigned_team[0].role.includes("Lead") ? "your lead" : "your pod"}</span></p>
                  </div>
                </div>
                <Link
                  to="/portal/creative-pod"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-white/[0.12] text-[13px] font-medium text-white hover:bg-white/[0.05] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                  Message
                </Link>
              </div>
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}
