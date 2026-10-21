import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  ChevronRight,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";
import { usePlatformSidebar } from "./PlatformSidebarContext";

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

function isActive(href: string, pathname: string) {
  if (href === "/platform") return pathname === "/platform" || pathname === "/platform/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function PlatformSidebar() {
  const location = useLocation();
  const { mobileOpen, setMobileOpen } = usePlatformSidebar();
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

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

  async function handleLogout() {
    const ok = await confirm({
      title: "Sign Out?",
      description: "Are you sure you want to end your platform admin session?",
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
      label: "OVERVIEW",
      items: [
        { label: "Platform Dashboard", href: "/platform", icon: LayoutDashboard },
      ],
    },
    {
      label: "TENANT MANAGEMENT",
      items: [
        { label: "Agencies", href: "/platform/agencies", icon: Building2 },
        { label: "SaaS Plans", href: "/platform/plans", icon: Zap },
        { label: "Subscriptions", href: "/platform/subscriptions", icon: CreditCard },
      ],
    },
    {
      label: "FINANCE & REVENUE",
      items: [
        { label: "Revenue & Payments", href: "/platform/revenue", icon: TrendingUp },
      ],
    },
    {
      label: "GOVERNANCE",
      items: [
        { label: "Security & Governance", href: "/platform/security", icon: ShieldCheck },
        { label: "Platform Settings", href: "/platform/settings", icon: Settings },
      ],
    },
    {
      label: "ACCOUNT",
      items: [],
    },
  ];

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[9998] bg-app-void/75 backdrop-blur-sm lg:hidden cursor-pointer"
        />
      )}

      <aside
        aria-label="Platform admin navigation sidebar"
        className={`fixed inset-y-0 left-0 z-[9999] lg:z-40 flex w-[280px] max-w-[85vw] flex-col bg-app-surface border-r border-app-line shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 visible" : "-translate-x-full invisible lg:visible"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-app-line flex items-center justify-between bg-app-base/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Link to="/platform" className="text-xl font-black text-hi tracking-tighter">
              creo<span className="text-app-accent text-2xl leading-none">.</span>
            </Link>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
              SUPER ADMIN
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden size-8 rounded-xl flex items-center justify-center text-app-mist hover:text-hi hover:bg-app-surface border border-transparent hover:border-app-line transition-colors cursor-pointer"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Identity Card */}
        <div className="px-4 py-3 border-b border-app-line bg-app-base/40 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-rose-500/8 border border-rose-500/20">
            <div className="size-7 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-rose-400 uppercase tracking-wider truncate">Platform Control</p>
              <p className="text-[10px] text-app-mist truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 space-y-5 text-left [scrollbar-width:thin] [scrollbar-color:#2A3446_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-app-line [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-app-accent/50">
          {sections.map((section, idx) => (
            <div key={section.label || `section-${idx}`} className="space-y-1.5">
              {section.label && (
                <div className="px-3 pb-1 text-xs font-black uppercase tracking-wider text-app-accent">
                  {section.label}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href, location.pathname);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold transition-all ${
                        active
                          ? "bg-app-accent-soft text-app-base shadow-sm font-black"
                          : "text-app-mist hover:text-hi hover:bg-app-base/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-app-base" : "text-app-accent"}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                            active ? "bg-app-base/20 text-app-base" : "bg-app-accent/20 text-app-accent"
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : (
                        !active && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#4A5568] opacity-0 group-hover:opacity-100" />
                      )}
                    </Link>
                  );
                })}

                {section.label === "ACCOUNT" && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Platform Version Footer */}
        <div className="p-3.5 border-t border-app-line bg-app-base/80 shrink-0">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] text-[#4A5568] font-medium">Creo Platform</span>
            <span className="text-[10px] text-[#4A5568] font-mono">v2.4.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
