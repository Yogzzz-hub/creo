import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
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
  TrendingUp,
  FileText,
  Briefcase,
  Users,
  ListTodo,
  Send,
  Building2,
  LifeBuoy,
  ShieldCheck,
  ExternalLink,
  CheckSquare,
  CalendarCheck,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";
import { useAdminSidebar } from "./AdminSidebarContext";
import { WorkstationSidebar } from "../workstation/WorkstationSidebar";
import { fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";

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
  const [loggingOut, setLoggingOut] = useState(false);

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

  // Specialists keep the member workstation layout
  const isMemberRole =
    !isClientRole &&
    !isTeamLead &&
    !isBDERole &&
    !isFreelancerRole &&
    (isSpecialist ||
      location.pathname.startsWith("/workstation") ||
      location.pathname.startsWith("/member"));

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search, setMobileOpen]);

  // Handle escape key on mobile
  useEffect(() => {
    if (!mobileOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, setMobileOpen]);

  // Live query for Pod Lead deliverables needing review
  const { data: podData } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 30_000,
    enabled: isTeamLead,
  });

  const pendingReviewCount =
    podData?.pod?.stats?.internal_qa ??
    podData?.tasks?.internal_qa?.length ??
    0;

  if (isMemberRole) {
    return <WorkstationSidebar />;
  }

  const handleLogout = async () => {
    const shouldLogout = await confirm({
      title: "Log out of Creo?",
      description: "You will need to sign in again to access your workspace.",
      confirmText: "Log out",
      cancelText: "Stay signed in",
      tone: "warning",
      icon: "logout",
    });
    if (!shouldLogout) return;
    setMobileOpen(false);
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // Continue to the sign-in page even if the server session has expired.
    } finally {
      setLoggingOut(false);
    }
    navigate("/auth");
  };

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
    if (href === "/admin/pod-dashboard") {
      return (
        location.pathname === "/admin/pod-dashboard" ||
        location.pathname === "/admin/pod" ||
        location.pathname === "/lead/dashboard" ||
        location.pathname === "/lead" ||
        location.pathname === "/pod-lead" ||
        location.pathname === "/team-lead/dashboard" ||
        location.pathname === "/team-lead"
      );
    }
    if (href === "/lead/deliverables") {
      return (
        location.pathname === "/lead/deliverables" ||
        location.pathname === "/team-lead/deliverables" ||
        location.pathname.startsWith("/lead/deliverables/")
      );
    }
    if (href === "/lead/tasks") {
      return (
        location.pathname === "/lead/tasks" ||
        location.pathname === "/team-lead/tasks" ||
        location.pathname.startsWith("/lead/tasks/") ||
        location.pathname === "/freelance-management"
      );
    }
    if (href === "/lead/schedule") {
      return (
        location.pathname === "/lead/schedule" ||
        location.pathname === "/team-lead/schedule"
      );
    }
    if (href === "/lead/clients") {
      return (
        location.pathname === "/lead/clients" ||
        location.pathname === "/team-lead/clients" ||
        location.pathname.startsWith("/lead/clients/") ||
        location.pathname.startsWith("/team-lead/clients/")
      );
    }
    if (href === "/admin/publishing") {
      return (
        location.pathname === "/admin/publishing" ||
        location.pathname === "/lead/publishing" ||
        location.pathname === "/workstation/publishing"
      );
    }
    if (href === "/bde") {
      return location.pathname === "/bde" && (!location.search || location.search === "" || location.search === "?tab=pipeline");
    }
    if (href === "/portal") return location.pathname === "/portal" || location.pathname === "/portal/";
    if (href === "/admin") return location.pathname === "/admin";
    if (href === "/slack" || href === "/workstation/slack") {
      return (
        location.pathname === "/slack" ||
        location.pathname.startsWith("/slack/") ||
        location.pathname === "/workstation/slack" ||
        location.pathname === "/workstation/chat" ||
        location.pathname === "/admin/slack"
      );
    }
    if (href === "/admin/support") {
      return (
        location.pathname === "/admin/support" ||
        location.pathname.startsWith("/admin/support/tickets")
      );
    }
    if (href === "/admin/sla" || href === "/admin/support/sla") {
      return (
        location.pathname === "/admin/sla" ||
        location.pathname === "/admin/support/sla" ||
        location.pathname.startsWith("/admin/support/sla")
      );
    }
    if (location.pathname === href) return true;
    return location.pathname.startsWith(href + "/");
  };

  const adminNavSections: NavSection[] = [
    {
      label: "OVERVIEW",
      items: [
        { label: "Home", href: "/admin", icon: Home },
        { label: "Review", href: "/admin/deliverables", icon: FileCheck },
        { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
        { label: "Task Queue", href: "/admin/tasks", icon: ListTodo },
      ],
    },
    {
      label: "REVENUE ENGINE",
      items: [
        { label: "Manage Revenues", href: "/admin/revenue", icon: TrendingUp },
        { label: "Plans & Negotiations", href: "/admin/plans", icon: FileText },
        { label: "BDE Oversight", href: "/admin/bde-oversight", icon: Briefcase, badge: "CRM" },
      ],
    },
    {
      label: "TEAM & CLIENTS",
      items: [
        { label: "Team Management", href: "/admin/team", icon: Users },
        { label: "Productivity & KPIs", href: "/admin/productivity", icon: TrendingUp, badge: "KPIs" },
        { label: "Leave Approvals", href: "/admin/leaves", icon: CalendarCheck },
        { label: "Client Directory", href: "/admin/clients", icon: Building2 },
        { label: "Instagram Publishing", href: "/admin/publishing", icon: Send },
      ],
    },
    {
      label: "OPERATIONS & SLA",
      items: [
        { label: "Slack Chat", href: "/slack", icon: MessageSquare, badge: "Chat" },
        { label: "SLA Performance", href: "/admin/support/sla", icon: ShieldCheck },
        { label: "Support Desk", href: "/admin/support", icon: LifeBuoy },
      ],
    },
    {
      label: "ACCOUNT",
      items: [],
    },
  ];

  const leadNavSections: NavSection[] = [
    {
      label: "OVERVIEW",
      items: [
        { label: "Home", href: "/admin/pod-dashboard", icon: Home },
        {
          label: "Review",
          href: "/lead/deliverables",
          icon: FileCheck,
          badge: pendingReviewCount > 0 ? String(pendingReviewCount) : undefined,
        },
        { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
        { label: "Task Queue", href: "/lead/tasks", icon: ListTodo },
      ],
    },
    {
      label: "TEAM & CLIENTS",
      items: [
        { label: "Client Allocations", href: "/lead/clients", icon: Building2 },
        { label: "Leave & Schedule", href: "/lead/schedule", icon: CalendarCheck },
        { label: "Instagram Publishing", href: "/admin/publishing", icon: Send },
      ],
    },
    {
      label: "OPERATIONS & SLA",
      items: [
        { label: "Slack Chat", href: "/slack", icon: MessageSquare, badge: "Chat" },
        { label: "SLA Performance", href: "/admin/sla", icon: ShieldCheck },
        { label: "Support Desk", href: "/admin/support", icon: LifeBuoy },
      ],
    },
    {
      label: "ACCOUNT",
      items: [
        { label: "Settings", href: "/workstation/settings", icon: Settings },
      ],
    },
  ];

  const bdeNavSections: NavSection[] = [
    {
      label: "OVERVIEW",
      items: [
        { label: "Sales Funnel & Leads", href: "/bde", icon: Briefcase },
        { label: "Follow-Up Agenda", href: "/bde?tab=calendar", icon: CalendarCheck },
        { label: "Forecasting & Win/Loss", href: "/bde?tab=analytics", icon: TrendingUp },
        { label: "Leave & Time Off", href: "/bde/leave", icon: CalendarDays },
      ],
    },
    {
      label: "COMMERCIALS",
      items: [
        { label: "Plans Catalog", href: "/admin/plans", icon: FileText },
        { label: "Slack Chat", href: "/slack", icon: MessageSquare, badge: "Chat" },
      ],
    },
    {
      label: "ACCOUNT",
      items: [],
    },
  ];

  const freelancerNavSections: NavSection[] = [
    {
      label: "OVERVIEW",
      items: [
        { label: "Assigned Workload", href: "/freelancer/tasks", icon: CheckSquare },
        { label: "Time Off & Blackout", href: "/freelancer/leave", icon: CalendarDays },
        { label: "Slack Chat", href: "/slack", icon: MessageSquare, badge: "Chat" },
      ],
    },
    {
      label: "ACCOUNT",
      items: [],
    },
  ];

  const clientNavSections: NavSection[] = [
    {
      label: "OVERVIEW",
      items: [
        { label: "Home", href: "/portal", icon: Home },
        { label: "Review", href: "/portal/deliverables", icon: FileCheck },
        { label: "Calendar", href: "/portal/calendar", icon: CalendarDays },
        { label: "Library", href: "/portal/library", icon: FolderOpen },
      ],
    },
    {
      label: "YOUR BRAND",
      items: [
        { label: "Slack Chat", href: "/portal/slack", icon: MessageSquare, badge: "Chat" },
        { label: "Brand DNA", href: "/portal/brand", icon: Dna },
      ],
    },
    {
      label: "ACCOUNT",
      items: [
        { label: "Plan & billing", href: "/portal/payments", icon: CreditCard },
        { label: "Help", href: "/portal/support", icon: HelpCircle },
        { label: "Settings", href: "/portal/account", icon: Settings },
      ],
    },
  ];

  const portalPreviewSection: NavSection = {
    label: "CLIENT PORTAL (PREVIEW)",
    items: [
      { label: "Client Dashboard", href: "/portal", icon: Home },
      { label: "Content Deliverables", href: "/portal/deliverables", icon: FileCheck },
      { label: "Content Calendar", href: "/portal/calendar", icon: CalendarDays },
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
    : user?.role === "team_lead"
    ? (location.pathname.startsWith("/portal") ? [portalPreviewSection, ...leadNavSections] : leadNavSections)
    : (isAdminOrSuper && location.pathname.startsWith("/portal"))
    ? [portalPreviewSection, ...adminNavSections]
    : adminNavSections;

  const homeHref = isTeamLead
    ? "/admin/pod-dashboard"
    : isAdminOrSuper
    ? "/admin"
    : isBDERole
    ? "/bde"
    : isFreelancerRole
    ? "/freelancer/tasks"
    : "/portal";

  const roleBadge = isTeamLead
    ? "POD LEAD"
    : isAdminOrSuper
    ? "ADMIN"
    : isBDERole
    ? "BDE"
    : isFreelancerRole
    ? "FREELANCER"
    : isClientRole
    ? "CLIENT PORTAL"
    : "POD LEAD";

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

      {/* Navigation Sidebar: Exact 280px width, sleek navy background, matches Client Portal */}
      <aside
        aria-label="Operations navigation sidebar"
        className={`fixed inset-y-0 left-0 z-[9999] lg:z-30 flex w-[280px] max-w-[85vw] flex-col bg-[#161F2D] border-r border-[#2A3446] shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 visible" : "-translate-x-full invisible lg:visible"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-[#2A3446] flex items-center justify-between bg-[#0B111C]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Link to={homeHref} className="text-xl font-black text-white tracking-tighter">
              creo<span className="text-[#7FA0D6] text-2xl leading-none">.</span>
            </Link>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
              {roleBadge}
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

        {/* Quick Return Banner for Staff/Admins inspecting Client Portal */}
        {isAdminOrSuper && location.pathname.startsWith("/portal") && (
          <div className="p-3 bg-[#7FA0D6]/10 border-b border-[#2A3446] text-left shrink-0">
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between text-xs font-bold text-[#7FA0D6] hover:text-white px-3 py-2 rounded-xl bg-[#0B111C] border border-[#7FA0D6]/30 hover:border-[#7FA0D6]/60 transition-colors shadow-xs"
            >
              <span>← Return to Admin Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
        {isTeamLead && location.pathname.startsWith("/portal") && (
          <div className="p-3 bg-[#7FA0D6]/10 border-b border-[#2A3446] text-left shrink-0">
            <Link
              to="/admin/pod-dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between text-xs font-bold text-[#7FA0D6] hover:text-white px-3 py-2 rounded-xl bg-[#0B111C] border border-[#7FA0D6]/30 hover:border-[#7FA0D6]/60 transition-colors shadow-xs"
            >
              <span>← Return to Pod Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Scrollable Navigation - Exact view and item sizing */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 space-y-5 text-left [scrollbar-width:thin] [scrollbar-color:#2A3446_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2A3446] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#7FA0D6]/50">
          {currentNavSections.map((section, idx) => (
            <div key={section.label || `section-${idx}`} className="space-y-1.5">
              {section.label && (
                <div className="px-3 pb-1 text-xs font-black uppercase tracking-wider text-[#7FA0D6]">
                  {section.label}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isPathActive(item.href);
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
                {section.label.toUpperCase() === "ACCOUNT" && (
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
      </aside>
    </>
  );
}
