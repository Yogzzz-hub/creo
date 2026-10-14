import { Link, useLocation, useNavigate } from "react-router";
import { 
  ChevronLeft, 
  ExternalLink, 
  LogOut, 
  Menu
} from "lucide-react";
import { AdminKPIs } from "../../types/ops";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import { useAdminSidebar } from "./AdminSidebarContext";
import { useConfirm } from "../ui/ConfirmDialog";
import { NotificationMenu } from "../ui/NotificationMenu";

interface AdminTopHeaderProps {
  title?: string;
  hideTitle?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  kpis?: AdminKPIs | null;
  refreshing?: boolean;
  handleRefreshKpis?: () => void;
  showBackButton?: boolean;
}

export function AdminTopHeader({
  title,
  hideTitle = false,
  activeTab = "Dashboard",
  setActiveTab: _setActiveTab,
  kpis: _kpis,
  refreshing: _refreshing,
  handleRefreshKpis: _handleRefreshKpis,
  showBackButton = false,
}: AdminTopHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const { toggleMobile, mobileOpen } = useAdminSidebar();

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

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeProfile = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileDropdownOpen(false);
    };
    document.addEventListener("mousedown", closeProfile);
    return () => document.removeEventListener("mousedown", closeProfile);
  }, []);

  const resolvedTitle =
    title ||
    (location.pathname === "/portal" || location.pathname === "/portal/"
      ? "Client Dashboard"
      : location.pathname.startsWith("/portal/deliverables")
      ? "Content Deliverables"
      : location.pathname.startsWith("/portal/calendar")
      ? "Content Calendar"
      : location.pathname.startsWith("/portal/payments")
      ? "Plans & Billing"
      : location.pathname.startsWith("/portal/support")
      ? "Support Desk"
      : location.pathname.startsWith("/portal/brand") || (location.pathname.startsWith("/portal/account") && new URLSearchParams(location.search).get("tab") === "brand")
        ? "Brand DNA"
      : location.pathname.startsWith("/portal/account")
      ? "Account Settings"
      : location.pathname.startsWith("/portal/slack")
      ? "Slack Workspace Hub"
      : location.pathname.startsWith("/workstation/tasks") || location.pathname.startsWith("/member/tasks")
      ? "My Tasks"
      : location.pathname.startsWith("/workstation/schedule") || location.pathname.startsWith("/member/schedule")
      ? "My Schedule & PTO"
      : location.pathname.startsWith("/workstation") || location.pathname.startsWith("/member")
      ? "Workstation Overview"
      : location.pathname.includes("/slack")
      ? "Slack Workspace Hub"
      : location.pathname.includes("/admin/pod-dashboard") || location.pathname.includes("/lead/dashboard")
      ? "Team Details"
      : location.pathname.includes("/lead/tasks")
      ? "Content Engine"
      : location.pathname.includes("/lead/deliverables")
      ? "Content Engine"
      : location.pathname.includes("/lead/schedule")
      ? "Team Details"
      : location.pathname.includes("/lead/clients")
      ? "Client Details"
      : location.pathname.includes("/admin/revenue")
      ? "Revenue Engine"
      : location.pathname.includes("/admin/plans") || location.pathname.includes("/admin/sales")
      ? "Manage Plans & Negotiations"
      : location.pathname.includes("/admin/team")
      ? "Team Details & Management"
      : location.pathname.includes("/admin/leaves") || location.pathname.includes("/admin/leave")
      ? "Leave Approvals"
      : location.pathname.includes("/admin/deliverables")
      ? "Deliverables"
      : location.pathname.includes("/admin/calendar")
      ? "Content Calendar"
      : location.pathname.includes("/admin/tasks")
      ? "Production Task Queue"
      : location.pathname.includes("/admin/clients")
      ? "Client Details"
      : location.pathname.includes("/admin/support/sla") || location.pathname.includes("/admin/sla")
      ? "SLA Performance"
      : location.pathname.includes("/admin/support")
      ? "Support Tickets"
      : location.pathname.includes("/admin/announcements")
      ? "Announcements"
      : location.pathname.includes("/admin/reports") || location.pathname.includes("/admin/kpi")
      ? "Executive Analytics"
      : location.pathname.includes("/admin/addons")
      ? "Add-ons Catalog"
      : location.pathname.includes("/admin/settings")
      ? "System Settings"
      : activeTab);

  // For workstation / member role, completely remove/hide the floating capsule navbar
  // matching the Client Portal shell where notification & profile live in the sidebar.
  if (isMemberRole) {
    return null;
  }

  return (
    <div className={`sticky top-0 z-40 w-full bg-[#0B111C]/90 backdrop-blur-md pt-2 sm:pt-2.5 pb-1.5 sm:pb-2 transition-all ${location.pathname.startsWith("/portal") ? "px-4 sm:px-6" : "px-3.5 sm:px-6 lg:px-8"}`}>
      <header className="max-w-[1500px] mx-auto bg-[#161F2D] rounded-xl sm:rounded-full border border-[#2A3446] px-3.5 sm:px-5 lg:px-6 py-1.5 sm:py-2 flex items-center justify-between shadow-[0_4px_20px_rgba(5,8,16,0.5)] min-h-[44px] sm:min-h-[48px]">
        {/* Left Section: Mobile Hamburger + Back Button + Mobile Brand Logo + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            type="button"
            onClick={toggleMobile}
            className={`${location.pathname.startsWith("/portal") ? "lg:hidden" : "md:hidden"} size-8 rounded-full flex items-center justify-center text-[#97A0B3] hover:text-white hover:bg-[#161F2D] transition-all cursor-pointer border border-transparent hover:border-[#2A3446] focus:outline-none focus:ring-2 focus:ring-[#7FA0D6] shrink-0`}
            aria-expanded={mobileOpen}
            aria-label="Open navigation sidebar"
            title="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {showBackButton && (
            <Link
              to={
                isAdminOrSuper
                  ? "/admin"
                  : isTeamLead
                  ? "/admin/pod-dashboard"
                  : isMemberRole
                  ? "/workstation"
                  : "/portal"
              }
              className="p-1 rounded-full hover:bg-[#161F2D] text-[#97A0B3] hover:text-white transition-colors shrink-0"
              title="Go Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
          )}

          {/* Brand Logo - visible on mobile where sidebar is inside drawer */}
          <Link
            to={
              isAdminOrSuper
                ? "/admin"
                : isTeamLead
                ? "/admin/pod-dashboard"
                : isMemberRole
                ? "/workstation"
                : "/portal"
            }
            className="md:hidden flex items-center gap-0.5 font-extrabold text-white text-sm sm:text-base tracking-tight shrink-0 px-1 hover:opacity-85 transition-opacity"
            title="Creo. Home"
          >
            Creo<span className="text-[#7FA0D6] text-base sm:text-lg leading-none">.</span>
          </Link>

          {showBackButton && (
            <span className="h-4 w-px bg-[#2A3446] mx-1 hidden sm:block shrink-0" />
          )}

          {/* Active Page Title */}
          {!hideTitle && resolvedTitle && (
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
              {resolvedTitle}
            </h1>
          )}
        </div>

        {/* Right Utility Icons (Bell with Functional Dropdown, Profile with Dropdown) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 justify-end">
          {/* Functional Notification Bell Container */}
          <NotificationMenu />

          {/* Quick Return Button for Admins viewing Client Portal */}
          {isAdminOrSuper && location.pathname.startsWith("/portal") && (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/25 border border-[#7FA0D6]/30 text-[#7FA0D6] text-xs font-bold transition-all shadow-xs"
              title="Return to Admin Ops Console"
            >
              <span>Admin Console</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          {/* Profile Avatar with Interactive Dropdown Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              title={user?.full_name || "Profile & Account"}
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="size-8 sm:size-8.5 rounded-full bg-[#BCCCE6] hover:bg-[#BCCCE6] text-[#0B111C] font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-[#050810]/40 cursor-pointer ml-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-[#7FA0D6]"
              aria-label="User profile menu"
            >
              {(user?.full_name?.[0] || user?.email?.[0] || (isClientRole ? "C" : isMemberRole ? "D" : "A")).toUpperCase()}
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 sm:mt-3 w-[calc(100vw-24px)] sm:w-72 max-w-[320px] bg-[#161F2D] rounded-3xl shadow-[0_12px_40px_rgba(5,8,16,0.7)] border border-[#2A3446] z-50 overflow-hidden animate-scale-up p-3 space-y-2 text-left">
                {/* User Header */}
                <div className="p-3 bg-[#0B111C]/80 rounded-2xl border border-[#2A3446] flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#BCCCE6] text-[#0B111C] font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    {(user?.full_name?.[0] || user?.email?.[0] || (isClientRole ? "C" : isMemberRole ? "D" : "A")).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">
                      {user?.full_name || (isClientRole ? (user?.company_name || "Client Account") : isMemberRole ? "Team Specialist" : user?.role === "team_lead" ? "Pod Lead" : "Creo Admin")}
                    </h4>
                    <p className="text-[11px] text-[#97A0B3] font-medium truncate">
                      {user?.email || (isClientRole ? "client@portal.creo" : isMemberRole ? "specialist@creo.agency" : "admin@creo.agency")}
                    </p>
                    <div className="mt-1">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 capitalize">
                        {isClientRole
                          ? "Client Account"
                          : isMemberRole
                          ? "Pod Specialist"
                          : user?.role === "team_lead"
                          ? "Pod Lead"
                          : user?.role?.replace("_", " ") || "Administrator"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="pt-2 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={async () => {
                      const shouldLogout = await confirm({
                        title: "Log out of Creo?",
                        description: "You will need to sign in again to access your workspace.",
                        confirmText: "Log out",
                        cancelText: "Stay signed in",
                        tone: "warning",
                        icon: "logout",
                      });
                      if (!shouldLogout) return;
                      setProfileDropdownOpen(false);
                      try {
                        await logout();
                      } catch {
                        // Continue to the sign-in page even if the server session has expired.
                      }
                      navigate("/auth");
                    }}
                    className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#D8BF9B] hover:bg-[#D8BF9B]/15 hover:border-[#D8BF9B]/30 border border-transparent transition-all cursor-pointer shadow-xs"
                  >
                    <LogOut className="w-4 h-4 text-[#D8BF9B]" />
                    <span>Sign Out / Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
