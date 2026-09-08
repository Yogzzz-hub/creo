import { useState } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  FileImage,
  CalendarDays,
  LifeBuoy,
  UserCog,
  CreditCard,
  LogOut,
  Lock,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Deliverables", href: "/portal/deliverables", icon: FileImage, requiresSub: true },
  { label: "Calendar", href: "/portal/calendar", icon: CalendarDays, requiresSub: true },
  { label: "Payments", href: "/portal/payments", icon: CreditCard },
  { label: "Support", href: "/portal/support", icon: LifeBuoy, requiresSub: true },
  { label: "Account", href: "/portal/account", icon: UserCog },
];

const BOTTOM_TAB_ITEMS = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Deliverables", href: "/portal/deliverables", icon: FileImage, requiresSub: true },
  { label: "Calendar", href: "/portal/calendar", icon: CalendarDays, requiresSub: true },
  { label: "Plans", href: "/portal/payments", icon: CreditCard },
  { label: "Support", href: "/portal/support", icon: LifeBuoy, requiresSub: true },
  { label: "Account", href: "/portal/account", icon: UserCog },
];

function isActive(href: string, pathname: string) {
  if (href === "/portal") return pathname === "/portal";
  return pathname.startsWith(href);
}

export function PortalSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: subData } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isExpired =
    subData?.is_expired === true ||
    subData?.subscription?.status === "expired" ||
    subData?.subscription?.status === "canceled";

  const isSubscribed =
    !isExpired &&
    (subData?.is_active === true ||
      (!!subData?.subscription && ["active", "trialing"].includes(subData?.subscription?.status)));

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[var(--sidebar-width)] lg:flex-col">
      <div className="flex grow flex-col gap-y-6 bg-[#0D2137] px-4 pt-6 pb-4">
        <Link to="/portal" className="flex items-center gap-2 px-2">
          <span className="text-xl font-bold text-white tracking-tight">
            Creo
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, location.pathname);
            const isLocked = item.requiresSub && !isSubscribed;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D2137] ${
                  active
                    ? "bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white font-semibold shadow-md shadow-blue-500/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-1"
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isLocked && (
                  <span
                    title="Locked until active retainer"
                    className="flex items-center justify-center size-5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/25 group-hover:border-sky-400/50 transition-colors"
                  >
                    <Lock className="size-3" />
                  </span>
                )}
              </Link>
            );
          })}

          <div className="mt-auto space-y-2">
            {!isSubscribed && (
              <Link
                to="/portal/payments"
                className="flex items-center justify-between gap-2.5 rounded-xl bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 border border-sky-500/25 px-3 py-2.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/15 hover:border-sky-400/40 transition-all group shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-6 rounded-md bg-sky-500/20 border border-sky-500/30 text-sky-400 shadow-inner group-hover:scale-105 transition-transform">
                    <Lock className="size-3" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-white font-bold text-xs">Locked Features</span>
                    <span className="text-[9px] text-sky-300/80 font-normal">Choose plan to unlock</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 text-white font-bold uppercase tracking-wider transition-all shadow-xs">
                  Unlock
                </span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white hover:translate-x-1 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="size-4 shrink-0" />
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}

export function MobileBottomTabBar() {
  const location = useLocation();

  const { data: subData } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
  });

  const isExpired =
    subData?.is_expired === true ||
    subData?.subscription?.status === "expired" ||
    subData?.subscription?.status === "canceled";

  const isSubscribed =
    !isExpired &&
    (subData?.is_active === true ||
      (!!subData?.subscription && ["active", "trialing"].includes(subData?.subscription?.status)));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-white px-1 lg:hidden"
      style={{ height: "var(--bottomtab-height)" }}
    >
      {BOTTOM_TAB_ITEMS.map((item) => {
        const active = isActive(item.href, location.pathname);
        const isLocked = item.requiresSub && !isSubscribed;

        return (
          <Link
            key={item.href}
            to={item.href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-colors ${
              active ? "text-[#2B7BC4]" : "text-gray-400"
            }`}
          >
            <div className="relative">
              <item.icon className="size-5" />
              {isLocked && (
                <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  <Lock className="size-2" />
                </span>
              )}
            </div>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
