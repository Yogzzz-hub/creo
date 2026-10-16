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
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";
import { useAdminSidebar } from "../admin/AdminSidebarContext";

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
      { label: "Instagram Publishing", href: "/admin/publishing", icon: Send },
      { label: "Leave Requests", href: "/workstation/schedule", icon: Calendar },
      { label: "Slack Chat", href: "/workstation/slack", icon: MessageSquare, badge: "Chat" },
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

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search, setMobileOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen, setMobileOpen]);

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
          className="fixed inset-0 z-[9998] bg-[#050810]/75 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-label="Workstation navigation sidebar"
        className={`fixed inset-y-0 left-0 z-[9999] md:z-30 flex w-64 lg:w-72 max-w-[85vw] flex-col bg-[#161F2D] border-r border-[#2A3446] shadow-2xl transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0 visible" : "-translate-x-full invisible md:visible"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-[#2A3446] flex items-center justify-between bg-[#0B111C]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Link to="/workstation" className="text-xl font-black text-white tracking-tight flex items-center">
              Creo<span className="text-[#7FA0D6] text-2xl leading-none">.</span>
            </Link>
            <span className="text-[10.5px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300">
              Team Member
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden size-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent hover:border-[#2A3446] transition-colors cursor-pointer"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 py-4 space-y-5 text-left [scrollbar-width:thin] [scrollbar-color:#2A3446_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2A3446] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#7FA0D6]/50">
          {SECTIONS.map((section) => (
            <div key={section.label} className="space-y-1">
              <div className="text-[11px] font-bold tracking-wider text-slate-400/80 uppercase px-3 mb-2">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isPathActive(item.href, location.pathname);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between text-sm font-medium gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                        active
                          ? "bg-[#dce6f2] text-slate-950 font-semibold"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-[18px] h-[18px] shrink-0 ${
                            active ? "text-slate-950" : "text-sky-400"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            active
                              ? "bg-slate-950/10 text-slate-950 border border-slate-950/20"
                              : "bg-sky-950/80 text-sky-400 border border-sky-800/50"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
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

        {/* Anchored Bottom Actions */}
        <div className="p-3 border-t border-[#2A3446] bg-[#0B111C]/60 shrink-0 text-left space-y-1.5">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
            title="Log out of session"
            aria-label="Log out"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0 text-sky-400" />
            <span className="truncate">{loggingOut ? "Signing out..." : "Log out"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
