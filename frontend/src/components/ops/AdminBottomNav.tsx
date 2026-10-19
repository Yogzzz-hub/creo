import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  CheckCircle2,
  Calendar,
  MessageSquare,
  MoreHorizontal,
  Send,
  Settings,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";

export function AdminBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  // Close more drawer on route change
  useEffect(() => {
    setMoreDrawerOpen(false);
  }, [location.pathname, location.search]);

  // Handle escape key
  useEffect(() => {
    if (!moreDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moreDrawerOpen]);

  const isMemberWorkstationPath =
    location.pathname.startsWith("/workstation") ||
    location.pathname.startsWith("/member");

  const isMemberRole =
    isMemberWorkstationPath ||
    (user?.role !== "team_lead" &&
      user?.role !== "admin" &&
      user?.role !== "super_admin" &&
      (user?.role === "team_member" ||
        user?.role === "editor" ||
        user?.role === "designer"));

  // Only render for team members or member workstation routes
  if (!isMemberRole) {
    return null;
  }

  const memberNavItems = [
    {
      label: "Overview",
      href: "/workstation",
      icon: LayoutDashboard,
      isActive:
        location.pathname === "/workstation" ||
        location.pathname === "/workstation/" ||
        location.pathname === "/workstation/overview" ||
        location.pathname === "/member" ||
        location.pathname === "/member/" ||
        location.pathname === "/member/overview",
    },
    {
      label: "My Tasks",
      href: "/workstation/tasks",
      icon: CheckCircle2,
      isActive:
        location.pathname.startsWith("/workstation/tasks") ||
        location.pathname.startsWith("/member/tasks"),
    },
    {
      label: "Schedule",
      href: "/workstation/schedule",
      icon: Calendar,
      isActive:
        location.pathname.startsWith("/workstation/schedule") ||
        location.pathname.startsWith("/member/schedule"),
    },
    {
      label: "Slack",
      href: "/workstation/slack",
      icon: MessageSquare,
      isActive:
        location.pathname.startsWith("/workstation/slack") ||
        location.pathname.startsWith("/workstation/chat") ||
        location.pathname === "/slack",
    },
  ];

  const memberMoreLinks = [
    {
      label: "Instagram Publishing",
      href: "/admin/publishing",
      icon: Send,
      desc: "Schedule and track live auto-posting",
    },
    {
      label: "Settings",
      href: "/workstation/settings",
      icon: Settings,
      desc: "Profile, notification & preferences",
    },
  ];

  const handleLogout = async () => {
    const shouldLogout = await confirm({
      title: "Log out of Creo?",
      description: "You will need to sign in again to access your workstation.",
      confirmText: "Log out",
      cancelText: "Stay signed in",
      tone: "warning",
      icon: "logout",
    });
    if (!shouldLogout) return;
    setMoreDrawerOpen(false);
    try {
      await logout();
    } catch {
      // Continue navigation even if server session expired
    }
    navigate("/auth");
  };

  const isMoreActive =
    moreDrawerOpen ||
    location.pathname.startsWith("/workstation/settings") ||
    location.pathname.startsWith("/member/settings") ||
    location.pathname.startsWith("/admin/publishing") ||
    location.pathname.startsWith("/admin/calendar");

  return (
    <>
      {/* Fixed Bottom Navigation Bar (Linear / Apple Glass Style) */}
      <nav
        aria-label="Member Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F17]/90 backdrop-blur-2xl border-t border-white/[0.08] px-2 py-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-4px_25px_rgba(5,8,16,0.6)]"
      >
        <div className="max-w-[430px] mx-auto flex items-center justify-around">
          {memberNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center justify-center min-w-[58px] py-1 group transition-colors ${
                  isActive ? "text-[#38BDF8]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="relative">
                  <Icon className="w-[22px] h-[22px] transition-transform group-hover:scale-110" />
                  {isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#38BDF8] shadow-[0_0_6px_#38BDF8]" />
                  )}
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-0.5 ${
                    isActive
                      ? "font-bold text-[#38BDF8]"
                      : "font-medium text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Tab 5: More */}
          <button
            type="button"
            onClick={() => setMoreDrawerOpen(true)}
            className={`flex flex-col items-center justify-center min-w-[58px] py-1 group transition-colors cursor-pointer ${
              isMoreActive ? "text-[#38BDF8]" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="relative">
              <MoreHorizontal className="w-[22px] h-[22px] transition-transform group-hover:scale-110" />
              {isMoreActive && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#38BDF8] shadow-[0_0_6px_#38BDF8]" />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                isMoreActive
                  ? "font-bold text-[#38BDF8]"
                  : "font-medium text-slate-400 group-hover:text-slate-200"
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile More Sheet / Slide-up Drawer */}
      {moreDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-[99999] bg-[#050810]/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setMoreDrawerOpen(false)}
        >
          <div
            className="w-full bg-[#0B0F17]/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/[0.1] p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-400/15 border border-sky-400/30 text-sky-400 flex items-center justify-center font-bold text-xs shadow-sm">
                  ⚡
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Workstation Navigation</h3>
                  <p className="text-[11px] text-slate-400">Quick access to member workflow hubs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation links grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {memberMoreLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  location.pathname === link.href ||
                  location.pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMoreDrawerOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isActive
                        ? "bg-sky-400/15 border-sky-400/30 text-sky-300 shadow-sm"
                        : "bg-[#131B26]/80 border-white/[0.08] hover:bg-[#172232] text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isActive
                            ? "bg-sky-400 text-slate-950 font-bold"
                            : "bg-[#0B0F17] text-sky-400 border border-white/10"
                        }`}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold leading-tight text-white">{link.label}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{link.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </Link>
                );
              })}
            </div>

            {/* User Account / Logout Footer */}
            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                  {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : "ME"}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white truncate max-w-[150px]">
                    {user?.full_name || "Team Member"}
                  </div>
                  <div className="text-[10px] text-sky-400 font-semibold tracking-wider uppercase">
                    {user?.role?.replace(/_/g, " ") || "Member"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { AdminBottomNav as WorkstationBottomNav, AdminBottomNav as MemberBottomNav };
