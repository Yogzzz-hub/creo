import { Suspense, lazy, Component, type ReactNode, type ErrorInfo, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { ConfirmProvider } from "../components/ui/ConfirmDialog";
import { request } from "../lib/http";
import type { HealthResponse } from "../types/api";

// Public Layout & Landing Page (other pages are split into their own chunks)
import { PublicLayout } from "../components/public/PublicLayout";
import { HomePage } from "../pages/public/HomePage";
import {
  AboutPage,
  AuthPage,
  ClientsPage,
  FaqPage,
  GoogleCallbackPage,
  OnboardingView,
  PortalAccountPage,
  PortalCalendarPage,
  PortalCreativePodPage,
  PortalDashboardPage,
  PortalDeliverablesPage,
  PortalLibraryPage,
  PortalBrandDNAPage,
  PortalPaymentsPage,
  PortalSupportPage,
  PortfolioPage,
  PricingPage,
  PrivacyPage,
  TermsPage,
  preloadPortalPages,
  whenIdle,
} from "./lazy-pages";

import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "../components/auth/PublicOnlyRoute";
import { RequireOnboardingComplete } from "../components/auth/RequireOnboardingComplete";
import { RequireOnboardingStage } from "../components/auth/RequireOnboardingStage";
import { MandatoryPasswordResetModal } from "../components/auth/MandatoryPasswordResetModal";
import { CreoLoadingScreen } from "../components/ui/CreoLoadingScreen";
import { CreoLoader, CreoInlineLoader } from "../components/ui/CreoLoader";
import { SimpleErrorBoundary } from "../components/ui/SimpleErrorBoundary";

// Portal Layout (pages are lazy-loaded from ./lazy-pages)
import { PortalLayout } from "../components/portal/PortalLayout";

// Ops Layout & Features
import { OpsLayout } from "../components/ops/OpsLayout";
const AdminDashboard = lazy(() =>
  import("../features/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard }))
);

const AdminClientsPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminClientsPage }))
);
const AdminDeliverablesPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminDeliverablesPage }))
);
const AdminTasksPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminTasksPage }))
);
const AdminCalendarPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminCalendarPage }))
);
const AdminSupportTicketsPage = lazy(() =>
  import("../features/admin/AdminSupportTicketsPage").then((m) => ({ default: m.AdminSupportTicketsPage }))
);
const AdminTicketDetailPage = lazy(() =>
  import("../features/admin/AdminTicketDetailPage").then((m) => ({ default: m.AdminTicketDetailPage }))
);
const AdminSLAPerformancePage = lazy(() =>
  import("../features/admin/AdminSLAPerformancePage").then((m) => ({ default: m.AdminSLAPerformancePage }))
);
const ClientTicketDetailPage = lazy(() =>
  import("../pages/portal/PortalTicketDetailPage").then((m) => ({ default: m.ClientTicketDetailPage }))
);

const AdminRevenuePage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminRevenuePage }))
);
const AdminPlansPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminPlansPage }))
);
const AdminSalesPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminSalesPage }))
);

const AdminTeamManagementPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminTeamManagementPage }))
);
const AdminLeaveApprovalsPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminLeaveApprovalsPage }))
);
const AdminClientBrandPage = lazy(() =>
  import("../features/admin/AdminClientBrandPage").then((m) => ({ default: m.AdminClientBrandPage }))
);
const PodLeadDashboardPage = lazy(() =>
  import("../pages/admin/PodLeadDashboardPage").then((m) => ({ default: m.PodLeadDashboardPage }))
);
const PodTaskBoardPage = lazy(() =>
  import("../pages/admin/PodTaskBoardPage").then((m) => ({ default: m.PodTaskBoardPage }))
);
const PodDeliverablesReviewPage = lazy(() =>
  import("../pages/admin/PodDeliverablesReviewPage").then((m) => ({ default: m.PodDeliverablesReviewPage }))
);
const PodScheduleLeavePage = lazy(() =>
  import("../pages/admin/PodScheduleLeavePage").then((m) => ({ default: m.PodScheduleLeavePage }))
);
const PodClientAllocationsPage = lazy(() =>
  import("../pages/admin/PodClientAllocationsPage").then((m) => ({ default: m.PodClientAllocationsPage }))
);

// Team Member Workstation & Collaboration Hub
const MemberOverviewPage = lazy(() =>
  import("../pages/admin/MemberOverviewPage").then((m) => ({ default: m.MemberOverviewPage }))
);
const MemberTaskBoardPage = lazy(() =>
  import("../pages/admin/MemberTaskBoardPage").then((m) => ({ default: m.MemberTaskBoardPage }))
);

const MemberSchedulePTOPage = lazy(() =>
  import("../pages/admin/MemberSchedulePTOPage").then((m) => ({ default: m.MemberSchedulePTOPage }))
);
const SlackChatPage = lazy(() =>
  import("../pages/admin/SlackChatPage").then((m) => ({ default: m.SlackChatPage }))
);

function RouteLoading() {
  return <CreoLoadingScreen label="Loading Creo..." />;
}

class OnboardingErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("OnboardingErrorBoundary caught:", error, info);
  }
  override render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-md mx-auto p-8 rounded-2xl bg-white border border-[#2A3446] shadow-sm text-center my-12">
          <p className="text-sm text-rose-600 font-semibold mb-2">Something interrupted onboarding display.</p>
          <p className="text-xs text-[#97A0B3] mb-5">{this.state.error?.message || "Please reload to continue."}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-[#7FA0D6] text-white font-semibold text-xs hover:bg-[#7FA0D6] transition-colors"
          >
            Reload Onboarding
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function OnboardingPageWrapper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id || "00000000-0000-0000-0000-000000000001";

  // Warm the portal while the client works through onboarding
  useEffect(() => whenIdle(() => preloadPortalPages()), []);

  return (
    <div data-surface="review" className="bento-theme min-h-[100dvh] bg-[#0B111C] text-[#F8FAFC] flex flex-col overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-[#2A3446] bg-[#050810]/95 backdrop-blur-md px-4 sm:px-8 py-2.5 shadow-md shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="size-8 flex items-center justify-center rounded-xl bg-[#161F2D] border border-[#2A3446] font-mono text-sm font-bold text-[#7FA0D6] shadow-xs group-hover:scale-105 transition-transform">
              C
            </span>
            <div className="flex flex-col">
              <span className="text-base font-bold font-display tracking-tight text-white">
                creo<span className="text-[#7FA0D6]">.</span>
              </span>
              <span className="text-[10px] font-semibold text-[#97A0B3] -mt-1 tracking-wider uppercase">
                Client Onboarding
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
            <Link
              to="/"
              className="text-[#97A0B3] hover:text-white transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              ← Back to Home
            </Link>
            <a
              href="https://wa.me/919941999415"
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap text-[#97A0B3] hover:text-[#7FA0D6] transition-colors inline-flex items-center gap-1.5"
            >
              <span className="sm:hidden">Help</span>
              <span className="hidden sm:inline">Need Help?</span>
            </a>
            <Link
              to="/portal"
              className="whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#161F2D] text-[#BCCCE6] hover:bg-[#2A3446] border border-[#2A3446] transition-colors"
            >
              <span className="sm:hidden">Portal →</span>
              <span className="hidden sm:inline">Go to Portal →</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Onboarding Canvas - full page view with generous space */}
      <main className="flex-1 min-h-0 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 flex flex-col items-center">
        <OnboardingErrorBoundary>
          <Suspense fallback={<CreoInlineLoader label="Loading your onboarding" />}>
            <OnboardingView userId={userId} onPortalLaunch={() => navigate("/portal")} />
          </Suspense>
        </OnboardingErrorBoundary>
      </main>
    </div>
  );
}


function HealthPage() {
  const { data, isLoading } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: () => request<HealthResponse>("/api/v1/health"),
    refetchInterval: 5000,
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#BCCCE6] text-[#0B111C] p-6 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-[#2A3446] bg-white p-8 shadow-lg space-y-6">
        <div className="flex items-center gap-3 border-b border-[#2A3446] pb-4">
          <div className="size-10 rounded-xl bg-[#BCCCE6] border border-[#2A3446] flex items-center justify-center text-[#7FA0D6] font-bold">
            ⚡
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0B111C]">Creo System Status</h1>
            <p className="text-xs text-[#97A0B3] mt-0.5">
              Real-time backend API & Database health
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-[#161F2D] py-2">
            <span className="text-[#97A0B3] font-medium">API Service</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {data?.status || (isLoading ? "Checking..." : "Error")}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-[#161F2D] py-2">
            <span className="text-[#97A0B3] font-medium">Platform Version</span>
            <span className="font-mono text-[#0B111C] font-semibold">{data?.version || "0.1.0"}</span>
          </div>
          <div className="flex justify-between items-center border-b border-[#161F2D] py-2">
            <span className="text-[#97A0B3] font-medium">Database Engine</span>
            <span className="font-mono text-emerald-700 font-semibold">PostgreSQL (Connected)</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            to="/"
            className="flex-1 text-center rounded-xl bg-[#7FA0D6] py-2.5 text-xs font-bold text-white hover:bg-[#7FA0D6] transition-colors shadow-xs"
          >
            Landing Page
          </Link>
          <Link
            to="/portal"
            className="flex-1 text-center rounded-xl bg-[#BCCCE6] border border-[#2A3446] py-2.5 text-xs font-bold text-[#7FA0D6] hover:bg-[#161F2D] transition-colors"
          >
            Client Portal
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Prefetch the chunks a signed-in user is most likely to open next, once the browser is idle. */
function RoutePrefetcher() {
  const { user } = useAuth();
  const role = user?.role;
  const needsOnboarding = role === "client" && (user?.onboarding_stage ?? 0) < 8;

  useEffect(() => {
    if (role !== "client" && role !== "admin" && role !== "super_admin") return;
    return whenIdle(() => preloadPortalPages({ includeOnboarding: needsOnboarding }));
  }, [role, needsOnboarding]);

  return null;
}

function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Reset internal container scroll positions (e.g., ops/portal layout surfaces)
    const scrollContainers = document.querySelectorAll(
      "main, [data-surface], .overflow-y-auto, div[class*='overflow-y-auto']"
    );
    scrollContainers.forEach((el) => {
      try {
        el.scrollTop = 0;
      } catch (_e) {
        // ignore non-scrollable nodes
      }
    });
  }, [pathname, search, hash]);

  return null;
}

function SupportRedirect() {
  const { user } = useAuth();
  if (user?.role === "admin" || user?.role === "super_admin") {
    return <Navigate to="/admin/support" replace />;
  }
  if (user) {
    return <Navigate to="/portal/support" replace />;
  }
  return <Navigate to="/pricing" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <ScrollToTop />
          <RoutePrefetcher />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              {/* Universal Support Redirect */}
              <Route path="/support" element={<SupportRedirect />} />

              {/* 1. Public Marketing Pages (Open to All) */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/work" element={<PortfolioPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
              </Route>

              {/* 2. Authentication Flow (Public Only - redirect to role home if authenticated) */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <AuthPage defaultView="login" />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <AuthPage defaultView="signup" />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/auth"
                element={
                  <PublicOnlyRoute>
                    <AuthPage defaultView="login" />
                  </PublicOnlyRoute>
                }
              />
              <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
              <Route path="/auth/callback/google" element={<GoogleCallbackPage />} />
              <Route path="/verifying" element={<CreoLoader />} />
              <Route path="/loader-preview" element={<CreoLoader />} />

              {/* 3. Onboarding Multi-stage Flow (Client + Admin) */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute allowedRoles={["client", "admin", "super_admin"]}>
                    <RequireOnboardingStage>
                      <OnboardingPageWrapper />
                    </RequireOnboardingStage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/onboarding/:stage"
                element={
                  <ProtectedRoute allowedRoles={["client", "admin", "super_admin"]}>
                    <RequireOnboardingStage>
                      <OnboardingPageWrapper />
                    </RequireOnboardingStage>
                  </ProtectedRoute>
                }
              />

              {/* 4. Client Portal Surface (Client + Admin Review) */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute allowedRoles={["client", "admin", "super_admin"]}>
                    <RequireOnboardingComplete>
                      <PortalLayout />
                    </RequireOnboardingComplete>
                  </ProtectedRoute>
                }
              >
                <Route index element={<PortalDashboardPage />} />
                <Route path="deliverables" element={<SimpleErrorBoundary name="Deliverables"><PortalDeliverablesPage /></SimpleErrorBoundary>} />
                <Route path="calendar" element={<PortalCalendarPage />} />
                <Route path="creative-pod" element={<PortalCreativePodPage />} />
                <Route path="creative_pod" element={<PortalCreativePodPage />} />
                <Route path="payments" element={<PortalPaymentsPage />} />
                <Route path="support" element={<SimpleErrorBoundary name="Support"><PortalSupportPage /></SimpleErrorBoundary>} />
                <Route path="support/:ticketId" element={<ClientTicketDetailPage />} />

                <Route path="account" element={<PortalAccountPage />} />
                <Route path="brand" element={<PortalBrandDNAPage />} />
                <Route path="brand-dna" element={<PortalBrandDNAPage />} />
                <Route path="library" element={<PortalLibraryPage />} />
              </Route>

              {/* 5. Agency Operations Surface (Ops Paper Surface - Admin, Super Admin, Team) */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer", "sales", "investor_relations"]}
                  >
                    <OpsLayout />
                  </ProtectedRoute>
                }
              >
                {/* Executive Admin Suite (Admin & Super Admin only - Team members auto-redirect to /dashboard) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                      <AdminDashboard actorRole="admin" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                      <AdminDashboard actorRole="admin" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                      <AdminClientsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/:clientId"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                      <AdminClientsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/:clientId/brand"
                  element={<AdminClientBrandPage />}
                />
                <Route path="/admin/calendar" element={<AdminCalendarPage />} />
                <Route path="/admin/deliverables" element={<AdminDeliverablesPage />} />
                <Route path="/admin/tasks" element={<AdminTasksPage />} />
                <Route path="/admin/support" element={<AdminSupportTicketsPage />} />
                <Route path="/admin/support/tickets" element={<AdminSupportTicketsPage />} />
                <Route path="/admin/support/tickets/:ticketId" element={<AdminTicketDetailPage />} />
                <Route path="/admin/support/sla" element={<AdminSLAPerformancePage />} />
                <Route path="/admin/sla" element={<AdminSLAPerformancePage />} />
                <Route
                  path="/admin/teams"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead"]}>
                      <AdminTeamManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/team"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead"]}>
                      <AdminTeamManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/admin/leave" element={<AdminLeaveApprovalsPage />} />
                <Route path="/admin/leaves" element={<AdminLeaveApprovalsPage />} />
                <Route path="/admin/announcements" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/reports" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/kpi" element={<Navigate to="/admin" replace />} />
                <Route
                  path="/admin/revenue"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "investor_relations", "sales"]}>
                      <AdminRevenuePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/plans"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                      <AdminPlansPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/sales"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "sales"]}>
                      <AdminSalesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/addons"
                  element={<Navigate to="/admin" replace />}
                />
                <Route
                  path="/admin/escalations"
                  element={<Navigate to="/admin/support" replace />}
                />
                <Route
                  path="/admin/settings"
                  element={<Navigate to="/admin" replace />}
                />
                <Route path="/lead" element={<Navigate to="/lead/dashboard" replace />} />
                <Route path="/pod-lead" element={<Navigate to="/lead/dashboard" replace />} />
                <Route
                  path="/admin/pod-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodLeadDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/pod"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodLeadDashboardPage />
                    </ProtectedRoute>
                  }
                />
                {/* Team Lead Portal Routes */}
                <Route path="/team-lead" element={<Navigate to="/team-lead/dashboard" replace />} />
                <Route
                  path="/team-lead/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodLeadDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/team-lead/tasks"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodTaskBoardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/team-lead/deliverables"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodDeliverablesReviewPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/team-lead/schedule"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodScheduleLeavePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/team-lead/clients"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodClientAllocationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/team-lead/clients/:clientId"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <AdminClientBrandPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/lead/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodLeadDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lead/tasks"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodTaskBoardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lead/deliverables"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodDeliverablesReviewPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lead/schedule"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodScheduleLeavePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lead/clients"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <PodClientAllocationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lead/clients/:clientId"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead", "team_member", "editor", "designer"]}>
                      <AdminClientBrandPage />
                    </ProtectedRoute>
                  }
                />

                {/* Team Member Workstation Pages */}
                <Route path="/workstation" element={<MemberOverviewPage />} />
                <Route path="/workstation/overview" element={<MemberOverviewPage />} />
                <Route path="/member" element={<MemberOverviewPage />} />
                <Route path="/member/overview" element={<MemberOverviewPage />} />

                <Route path="/workstation/tasks" element={<MemberTaskBoardPage />} />
                <Route path="/member/tasks" element={<MemberTaskBoardPage />} />

                <Route path="/workstation/handoff" element={<Navigate to="/workstation/tasks" replace />} />
                <Route path="/member/handoff" element={<Navigate to="/workstation/tasks" replace />} />

                <Route path="/workstation/schedule" element={<MemberSchedulePTOPage />} />
                <Route path="/member/schedule" element={<MemberSchedulePTOPage />} />

                {/* Universal Slack Hub */}
                <Route path="/slack" element={<SlackChatPage />} />
                <Route path="/workstation/slack" element={<SlackChatPage />} />
                <Route path="/admin/slack" element={<SlackChatPage />} />
                <Route path="/portal/slack" element={<SlackChatPage />} />

                {/* Redirect legacy Kanban routes to Task Queue */}
                <Route path="/dashboard" element={<Navigate to="/admin/pod-dashboard" replace />} />
                <Route path="/kanban" element={<Navigate to="/admin/tasks" replace />} />
              </Route>

              {/* 6. System Smoke Test & Fallbacks */}
              <Route path="/health" element={<HealthPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <MandatoryPasswordResetModal />
        </BrowserRouter>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
