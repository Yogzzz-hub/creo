import { useState } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  IndianRupee,
  Users,
  CheckSquare,
  Sparkles,
  CalendarCheck,
  CalendarDays,
  LifeBuoy,
  ShieldCheck,
  Layers,
  FileText,
  Sliders,
  X,
  Menu,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";

export function AdminBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const isTeamLead = user?.role === "team_lead";
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  // Admin Items
  const adminItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
    {
      label: "Revenue",
      href: "/admin/revenue",
      icon: IndianRupee,
      isActive: location.pathname.includes("/admin/revenue") || location.pathname.includes("/admin/plans"),
    },
    {
      label: "Clients",
      href: "/admin/clients",
      icon: Users,
      isActive: location.pathname.includes("/admin/clients"),
    },
    {
      label: "Work",
      href: "/admin/deliverables",
      icon: CheckSquare,
      isActive:
        location.pathname.includes("/admin/deliverables") ||
        location.pathname.includes("/admin/tasks") ||
        location.pathname.includes("/admin/calendar"),
    },
  ];

  // Team Lead Items
  const leadItems = [
    {
      label: "Pod",
      href: "/admin/pod-dashboard",
      icon: LayoutDashboard,
      isActive: location.pathname === "/admin/pod-dashboard" || location.pathname === "/lead/dashboard",
    },
    {
      label: "Tasks",
      href: "/lead/tasks",
      icon: CheckSquare,
      isActive: location.pathname.includes("/lead/tasks"),
    },
    {
      label: "Review",
      href: "/lead/deliverables",
      icon: Sparkles,
      isActive: location.pathname.includes("/lead/deliverables"),
    },
    {
      label: "Schedule",
      href: "/lead/schedule",
      icon: CalendarCheck,
      isActive: location.pathname.includes("/lead/schedule") || location.pathname.includes("/admin/leaves"),
    },
    {
      label: "Clients",
      href: "/lead/clients",
      icon: Users,
      isActive: location.pathname.includes("/lead/clients"),
    },
  ];

  // Team Member Workstation Items
  const isMemberRole =
    user?.role === "team_member" ||
    user?.role === "editor" ||
    user?.role === "designer" ||
    location.pathname.startsWith("/workstation") ||
    location.pathname.startsWith("/member");

  const memberItems = [
    {
      label: "Overview",
      href: "/workstation",
      icon: LayoutDashboard,
      isActive: location.pathname === "/workstation" || location.pathname === "/member" || location.pathname === "/workstation/overview",
    },
    {
      label: "My Tasks",
      href: "/workstation/tasks",
      icon: CheckSquare,
      isActive: location.pathname.includes("/workstation/tasks") || location.pathname.includes("/member/tasks"),
    },
    {
      label: "Schedule",
      href: "/workstation/schedule",
      icon: CalendarCheck,
      isActive: location.pathname.includes("/workstation/schedule") || location.pathname.includes("/member/schedule"),
    },
    {
      label: "Slack",
      href: "/slack",
      icon: MessageSquare,
      isActive: location.pathname.includes("/slack"),
    },
  ];

  const activeItems = isMemberRole ? memberItems : isTeamLead ? leadItems : adminItems;

  const memberMoreLinks = [
    { label: "Slack Workspace Hub", href: "/slack", icon: MessageSquare, desc: "Team & project communication" },
    { label: "My Schedule & PTO", href: "/workstation/schedule", icon: CalendarCheck, desc: "Request leave & shift schedule" },
    { label: "Asset Handoff QA", href: "/workstation/tasks", icon: CheckSquare, desc: "Submit files for lead sign-off" },
    { label: "Agency Calendar", href: "/admin/calendar", icon: CalendarDays, desc: "View all scheduled content" },
  ];

  const moreLinks = isMemberRole
    ? memberMoreLinks
    : isTeamLead
    ? [
        { label: "Slack Workspace Hub", href: "/slack", icon: MessageSquare, desc: "Pod chat & in-channel task assignment" },
        { label: "Publishing Calendar", href: "/admin/calendar", icon: CalendarDays, desc: "Scheduled creative posts" },
        { label: "Support Desk", href: "/admin/support", icon: LifeBuoy, desc: "Client tickets & queries" },
        { label: "SLA Hub", href: "/admin/sla", icon: ShieldCheck, desc: "Turnaround times & metrics" },
      ]
    : [
        { label: "Slack Workspace Hub", href: "/slack", icon: MessageSquare, desc: "Direct team & client chat, task creation" },
        { label: "Plans & Negotiations", href: "/admin/plans", icon: IndianRupee, desc: "Commercial deal retainers & pricing tiers" },
        { label: "Team Management", href: "/admin/team", icon: Users, desc: "Roster, pod capacity & leads" },
        { label: "Leave Requests", href: "/admin/leaves", icon: CalendarCheck, desc: "Staff time-off approvals" },
        { label: "Support Desk", href: "/admin/support", icon: LifeBuoy, desc: "Client support tickets" },
        { label: "SLA Performance", href: "/admin/support/sla", icon: ShieldCheck, desc: "Response & resolution metrics" },
        { label: "Content Calendar", href: "/admin/calendar", icon: CalendarDays, desc: "Agency content pipeline" },
        { label: "Task Queue", href: "/admin/tasks", icon: Layers, desc: "Agency-wide Kanban" },
        { label: "KPI & Reports", href: "/admin/reports", icon: FileText, desc: "Analytics & financial health" },
        { label: "System Settings", href: "/admin/settings", icon: Sliders, desc: "Agency configuration" },
      ];

  return (
    <>
      <nav
        aria-label="Admin Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#161F2D]/95 backdrop-blur-xl border-t border-[#2A3446] px-1 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-4px_25px_rgba(5,8,16,0.6)]"
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          {activeItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.isActive !== undefined
                ? item.isActive
                : item.exact
                ? location.pathname === item.href
                : location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 flex-1 min-w-0 max-w-[72px] ${
                  isActive
                    ? "text-[#BCCCE6] font-bold"
                    : "text-[#97A0B3] hover:text-white font-medium"
                }`}
              >
                <div className="relative">
                  <div
                    className={`p-1 rounded-xl transition-all ${
                      isActive ? "bg-[#BCCCE6]/15 text-[#BCCCE6]" : ""
                    }`}
                  >
                    <Icon
                      className={`size-4 sm:size-5 transition-transform ${
                        isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.8]"
                      }`}
                    />
                  </div>
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-[#7FA0D6]" />
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate w-full text-center">{item.label}</span>
              </Link>
            );
          })}

          {/* More Drawer Button */}
          <button
            type="button"
            onClick={() => setMoreDrawerOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 flex-1 min-w-0 max-w-[72px] cursor-pointer ${
              moreDrawerOpen
                ? "text-[#BCCCE6] font-bold"
                : "text-[#97A0B3] hover:text-white font-medium"
            }`}
          >
            <div className="relative">
              <div
                className={`p-1 rounded-xl transition-all ${
                  moreDrawerOpen ? "bg-[#BCCCE6]/15 text-[#BCCCE6]" : ""
                }`}
              >
                <Menu className="size-4 sm:size-5 stroke-[1.8]" />
              </div>
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate w-full text-center">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile More Sheet / Slide-up Drawer */}
      {moreDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[99999] bg-[#050810]/75 backdrop-blur-sm flex flex-col justify-end animate-fade-in"
          onClick={() => setMoreDrawerOpen(false)}
        >
          <div
            className="w-full bg-[#161F2D] rounded-t-3xl border-t border-[#2A3446] p-5 shadow-2xl max-h-[82vh] overflow-y-auto space-y-4 animate-slide-up text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2">
                <span className="size-8 rounded-xl bg-[#7FA0D6]/20 text-[#7FA0D6] flex items-center justify-center font-bold text-xs">
                  ⚡
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Workspace Navigation</h3>
                  <p className="text-[11px] text-[#97A0B3]">Quick access to all operations hubs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreDrawerOpen(false)}
                className="size-8 rounded-full bg-[#1F2C3F] text-[#97A0B3] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMoreDrawerOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isActive
                        ? "bg-[#7FA0D6]/15 border-[#7FA0D6]/40 text-[#BCCCE6]"
                        : "bg-[#0B111C] border-[#2A3446] hover:bg-[#1F2C3F] text-[#F1F5F9]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-9 rounded-xl flex items-center justify-center ${
                          isActive ? "bg-[#BCCCE6] text-[#0B111C]" : "bg-[#161F2D] text-[#97A0B3] border border-[#2A3446]"
                        }`}
                      >
                        <Icon className="size-4.5" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold leading-tight">{link.label}</div>
                        <div className="text-[10px] text-[#97A0B3] line-clamp-1">{link.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-[#97A0B3] shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
