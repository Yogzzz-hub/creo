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
          className="fixed inset-0 z-[9998] bg-[#050810]/75 backdrop-blur-sm lg:hidden cursor-pointer"
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-label="Workstation navigation sidebar"
        className={`fixed inset-y-0 left-0 z-[9999] lg:z-30 flex w-[280px] max-w-[85vw] flex-col bg-[#161F2D] border-r border-[#2A3446] shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 visible" : "-translate-x-full invisible lg:visible"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-[#2A3446] flex items-center justify-between bg-[#0B111C]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Link to="/workstation" className="text-xl font-black text-white tracking-tighter flex items-center">
              creo<span className="text-[#7FA0D6] text-2xl leading-none">.</span>
            </Link>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
              Team Member
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
      </aside>
    </>
  );
}
