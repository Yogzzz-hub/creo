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
  Building2,
  LifeBuoy,
  ShieldCheck,
  CreditCard,
  ExternalLink
} from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../lib/auth-context";
import { useAdminSidebar } from "./AdminSidebarContext";

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

  const isAdminOrSuper = user?.role === "admin" || user?.role === "super_admin";
  const isTeamLead = user?.role === "team_lead";
  const isSpecialist =
    user?.role === "team_member" ||
    user?.role === "editor" ||
    user?.role === "designer";

  const isClientRole =
    user?.role === "client" ||
    (!isAdminOrSuper && !isTeamLead && !isSpecialist && location.pathname.startsWith("/portal"));

  const isMemberRole =
    !isClientRole &&
    (isSpecialist ||
      location.pathname.startsWith("/workstation") ||
      location.pathname.startsWith("/member"));

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
    if (href === "/portal") return location.pathname === "/portal" || location.pathname === "/portal/";
    if (href === "/admin") return location.pathname === "/admin";
    if (href === "/workstation") return location.pathname === "/workstation" || location.pathname === "/workstation/overview";
    if (href === "/admin/support") return location.pathname === "/admin/support" || location.pathname.startsWith("/admin/support/tickets");
    if (location.pathname === href) return true;
    return location.pathname.startsWith(href + "/");
  };

  const adminNavSections: NavSection[] = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      label: "Revenue Engine",
      items: [
        { label: "Manage Revenues", href: "/admin/revenue", icon: TrendingUp },
        { label: "Plans & Negotiations", href: "/admin/plans", icon: FileText },
      ],
    },
    {
      label: "Team Management",
      items: [
        { label: "Team Management", href: "/admin/team", icon: Users },
        { label: "Leave Requests & Approvals", href: "/admin/leaves", icon: CalendarCheck },
      ],
    },
    {
      label: "Content Engine",
      items: [
        { label: "Deliverables Review", href: "/admin/deliverables", icon: Layers },
        { label: "Publishing Calendar", href: "/admin/calendar", icon: Calendar },
        { label: "Task Queue", href: "/admin/tasks", icon: ListTodo },
      ],
    },
    {
      label: "Client Details",
      items: [
        { label: "Client Directory & Portals", href: "/admin/clients", icon: Building2 },
      ],
    },
    {
      label: "Support & Operations",
      items: [
        { label: "Support Desk", href: "/admin/support", icon: LifeBuoy },
        { label: "SLA Performance Hub", href: "/admin/support/sla", icon: ShieldCheck },
        { label: "Slack Workspace Hub", href: "/slack", icon: MessageSquare, badge: "Chat" },
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
        { label: "SLA Performance Hub", href: "/admin/sla", icon: ShieldCheck },
        { label: "Support Desk", href: "/admin/support", icon: LifeBuoy },
        { label: "Slack Workspace Hub", href: "/slack", icon: MessageSquare, badge: "Chat" },
      ],
    },
  ];

  const memberNavSections: NavSection[] = [
    {
      label: "Workstation",
      items: [
        { label: "Workstation Overview", href: "/workstation", icon: LayoutDashboard },
        { label: "My Production Tasks", href: "/workstation/tasks", icon: CheckSquare },
        { label: "My Schedule & PTO", href: "/workstation/schedule", icon: Calendar },
        { label: "Slack Workspace Hub", href: "/slack", icon: MessageSquare, badge: "Chat" },
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
        { label: "Creative Pod", href: "/portal/creative-pod", icon: Briefcase },
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

  const portalPreviewSection: NavSection = {
    label: "Client Portal (Active View)",
    items: [
      { label: "Client Dashboard", href: "/portal", icon: LayoutDashboard },
      { label: "Content Deliverables", href: "/portal/deliverables", icon: Layers },
      { label: "Content Calendar", href: "/portal/calendar", icon: Calendar },
      { label: "Creative Pod", href: "/portal/creative-pod", icon: Briefcase },
      { label: "Plans & Billing", href: "/portal/payments", icon: CreditCard },
      { label: "Support Desk", href: "/portal/support", icon: LifeBuoy },
    ],
  };

  const currentNavSections = user?.role === "client"
    ? clientNavSections
    : isMemberRole
    ? memberNavSections
    : user?.role === "team_lead"
    ? (location.pathname.startsWith("/portal") ? [portalPreviewSection, ...leadNavSections] : leadNavSections)
    : (isAdminOrSuper && location.pathname.startsWith("/portal"))
    ? [portalPreviewSection, ...adminNavSections]
    : adminNavSections;

  const homeHref = isAdminOrSuper
    ? "/admin"
    : isTeamLead
    ? "/admin/pod-dashboard"
    : isMemberRole
    ? "/workstation"
    : "/portal";

  const renderNavContent = (onItemClick?: () => void) => (
    <>
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-[#2A3446] flex items-center justify-between bg-[#0B111C]/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <Link
            to={homeHref}
            onClick={onItemClick}
            className="flex items-center gap-0.5 font-black text-white text-xl tracking-tight"
          >
            creo<span className="text-[#7FA0D6] text-2xl leading-none">.</span>
          </Link>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
            {user?.role === "client"
              ? "Client Portal"
              : isMemberRole
              ? "Workstation"
              : user?.role === "team_lead"
              ? "Pod Lead"
              : "Admin Ops"}
          </span>
        </div>
        {onItemClick && (
          <button
            type="button"
            onClick={onItemClick}
            className="md:hidden size-8 rounded-xl flex items-center justify-center text-[#97A0B3] hover:text-white hover:bg-[#161F2D] border border-transparent hover:border-[#2A3446] transition-colors cursor-pointer"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Return Banner for Staff/Admins inspecting Client Portal */}
      {isAdminOrSuper && location.pathname.startsWith("/portal") && (
        <div className="p-3 bg-[#7FA0D6]/10 border-b border-[#2A3446] text-left">
          <Link
            to="/admin"
            onClick={onItemClick}
            className="flex items-center justify-between text-xs font-bold text-[#7FA0D6] hover:text-white px-3 py-2 rounded-xl bg-[#0B111C] border border-[#7FA0D6]/30 hover:border-[#7FA0D6]/60 transition-colors shadow-xs"
          >
            <span>← Return to Admin Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
      {isTeamLead && location.pathname.startsWith("/portal") && (
        <div className="p-3 bg-[#7FA0D6]/10 border-b border-[#2A3446] text-left">
          <Link
            to="/admin/pod-dashboard"
            onClick={onItemClick}
            className="flex items-center justify-between text-xs font-bold text-[#7FA0D6] hover:text-white px-3 py-2 rounded-xl bg-[#0B111C] border border-[#7FA0D6]/30 hover:border-[#7FA0D6]/60 transition-colors shadow-xs"
          >
            <span>← Return to Pod Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Scrollable Navigation - All menus directly visible, zero hover */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3.5 space-y-4 text-left [scrollbar-width:thin] [scrollbar-color:#2A3446_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2A3446] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#7FA0D6]/50">
        {currentNavSections.map((section) => (
          <div key={section.label} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-[#7FA0D6]">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isPathActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onItemClick}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? "bg-[#BCCCE6] text-[#0B111C] shadow-sm font-black"
                        : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#0B111C]" : "text-[#7FA0D6]"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                          active ? "bg-[#0B111C]/20 text-[#0B111C]" : "bg-[#7FA0D6]/20 text-[#7FA0D6]"
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

      {/* Footer: User Profile Card & Direct Sign Out */}
      <div className="p-3 border-t border-[#2A3446] bg-[#0B111C]/80 shrink-0 space-y-2 text-left">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#161F2D] border border-[#2A3446]">
          <div className="size-8 rounded-full bg-[#BCCCE6] text-[#0B111C] font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
            {(user?.full_name?.[0] || user?.email?.[0] || (isClientRole ? "C" : isMemberRole ? "D" : "A")).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">
              {user?.full_name || (isClientRole ? (user?.company_name || "Client Account") : isMemberRole ? "Team Specialist" : user?.role === "team_lead" ? "Pod Lead" : "Creo Admin")}
            </h4>
            <p className="text-[10px] text-[#97A0B3] font-medium truncate">
              {user?.email || "Email unavailable"}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (onItemClick) onItemClick();
              try {
                await logout();
              } catch {
                // ignore
              }
              navigate("/auth");
            }}
            className="p-1.5 rounded-lg text-[#97A0B3] hover:text-[#D8BF9B] hover:bg-[#D8BF9B]/10 transition-colors cursor-pointer"
            title="Sign Out / Log Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
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
