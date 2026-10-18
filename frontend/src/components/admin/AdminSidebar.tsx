import { Link, useLocation, useNavigate } from "react-router";
import { 
  Users, 
  CalendarCheck, 
  LogOut, 
  MessageSquare,
  X,
  LayoutDashboard,
  TrendingUp,
  FileText,
  Briefcase,
  Layers,
  CheckSquare,
  Calendar,
  ListTodo,
  Send,
  Building2,
  LifeBuoy,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  Settings
} from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../lib/auth-context";
import { useAdminSidebar } from "./AdminSidebarContext";
import { useConfirm } from "../ui/ConfirmDialog";
import { NotificationMenu } from "../ui/NotificationMenu";
import { WorkstationSidebar } from "../workstation/WorkstationSidebar";

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

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mobileOpen, setMobileOpen } = useAdminSidebar();
  const confirm = useConfirm();

  const handleLogout = async (onItemClick?: () => void) => {
    const shouldLogout = await confirm({
      title: "Log out of Creo?",
      description: "You will need to sign in again to access your workspace.",
      confirmText: "Log out",
      cancelText: "Stay signed in",
      tone: "warning",
      icon: "logout",
    });
    if (!shouldLogout) return;
    onItemClick?.();
    try {
      await logout();
    } catch {
      // Continue to the sign-in page even if the server session has expired.
    }
    navigate("/auth");
  };

  const isAdminOrSuper = user?.role === "admin" || user?.role === "super_admin";
  const isTeamLead = user?.role === "team_lead";
  const isSpecialist =
    user?.role === "team_member" ||
    user?.role === "editor" ||
    user?.role === "designer";
  const isBDERole = ["sales", "bde", "bde_head"].includes(user?.role || "");
  const isFreelancerRole = user?.role === "freelancer";

  const isClientRole =
    user?.role === "client" ||
    (!isAdminOrSuper && !isTeamLead && !isSpecialist && !isBDERole && !isFreelancerRole && location.pathname.startsWith("/portal"));

  // A team lead keeps the lead sidebar even on a /workstation URL; only specialists
  // (and unknown roles landing there) get the member layout.
  const isMemberRole =
    !isClientRole &&
    !isTeamLead &&
    !isBDERole &&
    !isFreelancerRole &&
    (isSpecialist ||
      location.pathname.startsWith("/workstation") ||
      location.pathname.startsWith("/member"));

  if (isMemberRole) {
    return <WorkstationSidebar />;
  }

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  // Handle escape key on mobile
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen, setMobileOpen]);

  const isPathActive = (href: string) => {
    if (href.includes("?")) {
      const [hrefPath, hrefQuery] = href.split("?");
      if (location.pathname !== hrefPath) return false;
      const currentParams = new URLSearchParams(location.search);
      const targetParams = new URLSearchParams(hrefQuery);
      for (const [key, val] of targetParams.entries()) {
        if (currentParams.get(key) !== val) return false;
      }
      return true;
    }
    if (href === "/bde") {
      return location.pathname === "/bde" && (!location.search || location.search === "" || location.search === "?tab=pipeline");
    }
    if (href === "/portal") return location.pathname === "/portal" || location.pathname === "/portal/";
    if (href === "/admin") return location.pathname === "/admin";
    if (href === "/workstation") return location.pathname === "/workstation" || location.pathname === "/workstation/overview";
    if (href === "/slack" || href === "/workstation/slack") {
      return (
        location.pathname === "/slack" ||
        location.pathname.startsWith("/slack/") ||
        location.pathname === "/workstation/slack" ||
        location.pathname === "/workstation/chat" ||
        location.pathname === "/admin/slack"
      );
    }
    if (href === "/admin/support") return location.pathname === "/admin/support" || location.pathname.startsWith("/admin/support/tickets");
    if (location.pathname === href) return true;
    return location.pathname.startsWith(href + "/");
  };


  const adminNavSections: NavSection[] = [
    {
      label: "OVERVIEW",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      label: "REVENUE ENGINE",
      items: [
        { label: "Manage Revenues", href: "/admin/revenue", icon: TrendingUp },
        { label: "Plans & Negotiations", href: "/admin/plans", icon: FileText },
        { label: "BDE Overview", href: "/admin/bde-oversight", icon: Briefcase, badge: "CRM" },
      ],
    },
    {
      label: "TEAM MANAGEMENT",
      items: [
        { label: "Team Management", href: "/admin/team", icon: Users },
        { label: "Productivity & Efficiency", href: "/admin/productivity", icon: TrendingUp, badge: "KPIs" },
        { label: "Leave Requests & Approvals", href: "/admin/leaves", icon: CalendarCheck },
      ],
    },
    {
      label: "CONTENT ENGINE",
      items: [
        { label: "Deliverables Review", href: "/admin/deliverables", icon: Layers },
        { label: "Publishing Calendar", href: "/admin/calendar", icon: Calendar },
        { label: "Instagram Publishing", href: "/admin/publishing", icon: Send },
        { label: "Task Queue", href: "/admin/tasks", icon: ListTodo },
      ],
    },
    {
      label: "CLIENT DETAILS",
      items: [
        { label: "Client Directory & Portals", href: "/admin/clients", icon: Building2 },
      ],
    },
    {
      label: "SUPPORT & OPERATIONS",
      items: [
        { label: "Support Desk", href: "/admin/support", icon: LifeBuoy },
        { label: "Performance Hub", href: "/admin/support/sla", icon: ShieldCheck },
        { label: "Workspace Hub", href: "/slack", icon: MessageSquare, badge: "Chat" },
      ],
    },
    {
      label: "ACCOUNT",
      items: [
        { label: "Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

  const leadNavSections: NavSection[] = [
    {
      label: "Team Management",
      items: [
        { label: "Dashboard", href: "/admin/pod-dashboard", icon: Briefcase },
        { label: "Leave Approvals & Schedule", href: "/lead/schedule", icon: CalendarCheck },
      ],
    },
    {
      label: "Content Engine",
      items: [
        { label: "Task Queue", href: "/lead/tasks", icon: ListTodo },
        { label: "Deliverables Review & Sign-Off", href: "/lead/deliverables", icon: Layers },
        { label: "Publishing Calendar", href: "/admin/calendar", icon: Calendar },
        { label: "Instagram Publishing", href: "/admin/publishing", icon: Send },
      ],
    },
    {
      label: "Client Details",
      items: [
        { label: "Client Allocations", href: "/lead/clients", icon: Building2 },
      ],
    },
    {
      label: "Support & SLA",
      items: [
        { label: "Performance Hub", href: "/admin/sla", icon: ShieldCheck },
        { label: "Support Desk", href: "/admin/support", icon: LifeBuoy },
        { label: "Workspace Hub", href: "/slack", icon: MessageSquare, badge: "Chat" },
      ],
    },
  ];

  const memberNavSections: NavSection[] = [
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

  const clientNavSections: NavSection[] = [
    {
      label: "Client Portal",
      items: [
        { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
        { label: "Content Deliverables", href: "/portal/deliverables", icon: Layers },
        { label: "Content Calendar", href: "/portal/calendar", icon: Calendar },
      ],
    },
    {
      label: "Billing & Support",
      items: [
        { label: "Plans & Billing", href: "/portal/payments", icon: CreditCard },
        { label: "Support Desk", href: "/portal/support", icon: LifeBuoy },
      ],
    },
  ];

  const bdeNavSections: NavSection[] = [
    {
      label: "BDE Workspace",
      items: [
        { label: "Sales Funnel & Leads", href: "/bde", icon: Briefcase },
        { label: "Follow-Up Agenda", href: "/bde?tab=calendar", icon: CalendarCheck },
        { label: "Forecasting & Win/Loss", href: "/bde?tab=analytics", icon: TrendingUp },
        { label: "Leave & Time Off", href: "/bde/leave", icon: Calendar },
      ],
    },
    {
      label: "Commercials & Enablement",
      items: [
        { label: "Platform Plans Catalog", href: "/admin/plans", icon: Layers },
      ],
    },
    {
      label: "Communication & Collab",
      items: [
        { label: "Team Slack Hub", href: "/slack", icon: MessageSquare },
      ],
    },
  ];


  const freelancerNavSections: NavSection[] = [
    {
      label: "Freelancer Studio",
      items: [
        { label: "Assigned Workload", href: "/freelancer/tasks", icon: CheckSquare },
        { label: "Time Off & Blackout", href: "/freelancer/leave", icon: Calendar },
      ],
    },
    {
      label: "Communication",
      items: [
        { label: "Team Slack Hub", href: "/slack", icon: MessageSquare },
      ],
    },
  ];

  const portalPreviewSection: NavSection = {
    label: "Client Portal (Active View)",
    items: [
      { label: "Client Dashboard", href: "/portal", icon: LayoutDashboard },
      { label: "Content Deliverables", href: "/portal/deliverables", icon: Layers },
      { label: "Content Calendar", href: "/portal/calendar", icon: Calendar },
      { label: "Plans & Billing", href: "/portal/payments", icon: CreditCard },
      { label: "Support Desk", href: "/portal/support", icon: LifeBuoy },
    ],
  };

  const currentNavSections = user?.role === "client"
    ? clientNavSections
    : isFreelancerRole
    ? freelancerNavSections
    : isBDERole
    ? bdeNavSections
    : isMemberRole
    ? memberNavSections
    : user?.role === "team_lead"
    ? (location.pathname.startsWith("/portal") ? [portalPreviewSection, ...leadNavSections] : leadNavSections)
    : (isAdminOrSuper && location.pathname.startsWith("/portal"))
    ? [portalPreviewSection, ...adminNavSections]
    : adminNavSections;

  const homeHref = isAdminOrSuper
    ? "/admin"
    : isFreelancerRole
    ? "/freelancer/tasks"
    : isBDERole
    ? "/bde"
    : isTeamLead
    ? "/admin/pod-dashboard"
    : isMemberRole
    ? "/workstation"
    : "/portal";

  const roleBadgeText = isAdminOrSuper
    ? (user?.role === "super_admin" ? "Super Admin" : "Admin")
    : isTeamLead
    ? "Team Lead"
    : isBDERole
    ? (user?.role === "bde_head" ? "BDE Head" : "BDE")
    : isFreelancerRole
    ? "Freelancer"
    : isClientRole
    ? "Client"
    : "Team Member";

  const renderNavContent = (onItemClick?: () => void) => (
    <>
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-[#2A3446] flex items-center justify-between bg-[#0B111C]/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <Link
            to={homeHref}
            onClick={onItemClick}
            className="text-xl font-black text-white tracking-tight flex items-center"
          >
            Creo<span className="text-[#7FA0D6] text-2xl leading-none">.</span>
          </Link>
          <span className="text-[10.5px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300">
            {roleBadgeText}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationMenu placement="sidebar" />
          {onItemClick && (
            <button
              type="button"
              onClick={onItemClick}
              className="md:hidden size-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent hover:border-[#2A3446] transition-colors cursor-pointer"
              aria-label="Close navigation sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Return Banner for Staff/Admins inspecting Client Portal */}
      {isAdminOrSuper && location.pathname.startsWith("/portal") && (
        <div className="p-3 bg-sky-500/10 border-b border-[#2A3446] text-left">
          <Link
            to="/admin"
            onClick={onItemClick}
            className="flex items-center justify-between text-xs font-bold text-sky-300 hover:text-white px-3 py-2 rounded-xl bg-[#0B111C] border border-sky-500/30 hover:border-sky-500/60 transition-colors shadow-xs"
          >
            <span>← Return to Admin Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
      {isTeamLead && location.pathname.startsWith("/portal") && (
        <div className="p-3 bg-sky-500/10 border-b border-[#2A3446] text-left">
          <Link
            to="/admin/pod-dashboard"
            onClick={onItemClick}
            className="flex items-center justify-between text-xs font-bold text-sky-300 hover:text-white px-3 py-2 rounded-xl bg-[#0B111C] border border-sky-500/30 hover:border-sky-500/60 transition-colors shadow-xs"
          >
            <span>← Return to Pod Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Scrollable Navigation - All menus directly visible with clear active highlight */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 py-4 space-y-5 text-left [scrollbar-width:thin] [scrollbar-color:#2A3446_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2A3446] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#7FA0D6]/50">
        {currentNavSections.map((section, idx) => (
          <div key={section.label || `section-${idx}`} className="space-y-1">
            {section.label && (
              <div className="text-[11px] font-bold tracking-wider text-slate-400/80 uppercase px-3 mb-2">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isPathActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onItemClick}
                    className={`flex items-center justify-between text-sm font-medium gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                      active
                        ? "bg-[#dce6f2] text-slate-950 font-semibold shadow-xs"
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

      {/* Anchored Bottom Actions */}
      <div className="p-3 border-t border-[#2A3446] bg-[#0B111C]/60 shrink-0 text-left space-y-1.5">
        <button
          type="button"
          onClick={() => void handleLogout(onItemClick)}
          className="w-full flex items-center text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
          title="Log out of session"
          aria-label="Log out"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0 text-slate-400" />
          <span className="truncate">Log out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── 1. Desktop Permanent Sidebar (Always Visible, Not Floating) ── */}
      {typeof document !== "undefined" &&
        createPortal(
          <aside
            className="hidden md:flex fixed top-0 bottom-0 left-0 w-64 lg:w-72 h-screen h-[100dvh] bg-[#161F2D] border-r border-[#2A3446] shadow-2xl z-30 flex-col overflow-hidden"
            aria-label="Admin Navigation Sidebar"
          >
            {renderNavContent()}
          </aside>,
          document.body
        )}

      {/* ── 2. Mobile Drawer (For small screens <md only) ── */}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            {mobileOpen && (
              <div
                className="fixed inset-0 bg-[#050810]/75 backdrop-blur-sm z-[9998] md:hidden transition-opacity duration-300"
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
              />
            )}
            <aside
              className={`fixed top-0 bottom-0 left-0 h-screen h-[100dvh] w-72 max-w-[85vw] bg-[#161F2D] border-r border-[#2A3446] shadow-2xl z-[9999] flex flex-col md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
                mobileOpen
                  ? "translate-x-0 opacity-100 visible"
                  : "-translate-x-full opacity-0 invisible pointer-events-none"
              }`}
              aria-label="Mobile Navigation Drawer"
            >
              {renderNavContent(() => setMobileOpen(false))}
            </aside>
          </>,
          document.body
        )}
    </>
  );
}
