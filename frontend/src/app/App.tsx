import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { request } from "../lib/http";
import type { HealthResponse } from "../types/api";

// Public Layout & Pages
import { PublicLayout } from "../components/public/PublicLayout";
import { HomePage } from "../pages/public/HomePage";
import { PricingPage } from "../pages/public/PricingPage";
import { PortfolioPage } from "../pages/public/PortfolioPage";
import { ClientsPage } from "../pages/public/ClientsPage";
import { AboutPage } from "../pages/public/AboutPage";
import { FaqPage } from "../pages/public/FaqPage";
import { TermsPage, PrivacyPage } from "../pages/public/TermsPrivacyPages";

import { AuthPage } from "../pages/auth/AuthPage";
import { GoogleCallbackPage } from "../pages/auth/GoogleCallbackPage";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "../components/auth/PublicOnlyRoute";
import { MandatoryPasswordResetModal } from "../components/auth/MandatoryPasswordResetModal";

// Portal Layout & Pages
import { PortalLayout } from "../components/portal/PortalLayout";
import { PortalDashboardPage } from "../pages/portal/PortalDashboardPage";
import { PortalDeliverablesPage } from "../pages/portal/PortalDeliverablesPage";
import { PortalCalendarPage } from "../pages/portal/PortalCalendarPage";
import { PortalPaymentsPage } from "../pages/portal/PortalPaymentsPage";
import { PortalSupportPage } from "../pages/portal/PortalSupportPage";
import { PortalAccountPage } from "../pages/portal/PortalAccountPage";

// Ops Layout & Features
import { OpsLayout } from "../components/ops/OpsLayout";
const AdminDashboard = lazy(() =>
  import("../features/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard }))
);
const KanbanBoard = lazy(() =>
  import("../features/kanban/KanbanBoard").then((m) => ({ default: m.KanbanBoard }))
);
const OnboardingView = lazy(() =>
  import("../features/onboarding/OnboardingView").then((m) => ({ default: m.OnboardingView }))
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
const AdminSupportPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminSupportPage }))
);
const AdminTeamsPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminTeamsPage }))
);
const AdminAnnouncementsPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminAnnouncementsPage }))
);
const AdminReportsPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminReportsPage }))
);
const AdminSalesPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminSalesPage }))
);
const AdminAddonsPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminAddonsPage }))
);
const AdminEscalationsPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminEscalationsPage }))
);
const AdminSettingsPage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminSettingsPage }))
);
const AdminLeavePage = lazy(() =>
  import("../features/admin/AdminSubPages").then((m) => ({ default: m.AdminLeavePage }))
);

function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] text-[#14171C] text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-3 border-[#2B7BC4] border-t-transparent" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Loading Creo...</span>
      </div>
    </div>
  );
}

function OnboardingPageWrapper() {
  const { user } = useAuth();
  const userId = user?.id || "00000000-0000-0000-0000-000000000001";

  return (
    <div data-surface="review" className="min-h-screen bg-[#E8F4FD] text-[#0D2137] flex flex-col overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-[#C9DFF0] bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3 shadow-xs shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="size-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#2B7BC4] to-[#1A5EA8] font-mono text-sm font-bold text-white shadow-xs group-hover:scale-105 transition-transform">
              C
            </span>
            <div className="flex flex-col">
              <span className="text-base font-bold font-display tracking-tight text-[#0D2137]">
                Creo
              </span>
              <span className="text-[10px] font-semibold text-[#64748B] -mt-1 tracking-wider uppercase">
                Client Onboarding
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
            <Link
              to="/"
              className="text-[#64748B] hover:text-[#2B7BC4] transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              ← Back to Home
            </Link>
            <a
              href="https://wa.me/919941999415"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#64748B] hover:text-[#2B7BC4] transition-colors inline-flex items-center gap-1.5"
            >
              Need Help?
            </a>
            <Link
              to="/portal"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E8F4FD] text-[#2B7BC4] hover:bg-[#D5EBFA] border border-[#C9DFF0] transition-colors"
            >
              Go to Portal →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Onboarding Canvas - full page view with generous space */}
      <main className="flex-1 max-w-5xl lg:max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center">
        <Suspense fallback={<RouteLoading />}>
          <OnboardingView
            userId={userId}
            onPortalLaunch={() => {
              window.location.href = "/portal";
            }}
          />
        </Suspense>
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#E8F4FD] text-[#0D2137] p-6 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-[#C9DFF0] bg-white p-8 shadow-lg space-y-6">
        <div className="flex items-center gap-3 border-b border-[#C9DFF0] pb-4">
          <div className="size-10 rounded-xl bg-[#E8F4FD] border border-[#C9DFF0] flex items-center justify-center text-[#2B7BC4] font-bold">
            ⚡
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0D2137]">Creo System Status</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Real-time backend API & Database health
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-[#F0F4F8] py-2">
            <span className="text-[#64748B] font-medium">API Service</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {data?.status || (isLoading ? "Checking..." : "Error")}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-[#F0F4F8] py-2">
            <span className="text-[#64748B] font-medium">Platform Version</span>
            <span className="font-mono text-[#0D2137] font-semibold">{data?.version || "0.1.0"}</span>
          </div>
          <div className="flex justify-between items-center border-b border-[#F0F4F8] py-2">
            <span className="text-[#64748B] font-medium">Database Engine</span>
            <span className="font-mono text-emerald-700 font-semibold">PostgreSQL (Connected)</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            to="/"
            className="flex-1 text-center rounded-xl bg-[#2B7BC4] py-2.5 text-xs font-bold text-white hover:bg-[#1A5EA8] transition-colors shadow-xs"
          >
            Landing Page
          </Link>
          <Link
            to="/portal"
            className="flex-1 text-center rounded-xl bg-[#E8F4FD] border border-[#C9DFF0] py-2.5 text-xs font-bold text-[#2B7BC4] hover:bg-[#D5EBFA] transition-colors"
          >
            Client Portal
          </Link>
        </div>
      </div>
    </main>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            {/* 1. Public Marketing Pages (Open to All) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
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

            {/* 3. Onboarding Multi-stage Flow (Client + Admin) */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute allowedRoles={["client", "admin", "super_admin"]}>
                  <OnboardingPageWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding/:stage"
              element={
                <ProtectedRoute allowedRoles={["client", "admin", "super_admin"]}>
                  <OnboardingPageWrapper />
                </ProtectedRoute>
              }
            />

            {/* 4. Client Portal Surface (Client + Admin Review) */}
            <Route
              path="/portal"
              element={
                <ProtectedRoute allowedRoles={["client", "admin", "super_admin"]}>
                  <PortalLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PortalDashboardPage />} />
              <Route path="deliverables" element={<PortalDeliverablesPage />} />
              <Route path="calendar" element={<PortalCalendarPage />} />
              <Route path="payments" element={<PortalPaymentsPage />} />
              <Route path="support" element={<PortalSupportPage />} />
              <Route path="account" element={<PortalAccountPage />} />
            </Route>

            {/* 5. Agency Operations Surface (Ops Paper Surface - Admin, Super Admin, Team) */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "super_admin", "team_lead", "team_member"]}
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
              <Route path="/admin/calendar" element={<AdminCalendarPage />} />
              <Route path="/admin/deliverables" element={<AdminDeliverablesPage />} />
              <Route path="/admin/tasks" element={<AdminTasksPage />} />
              <Route path="/admin/support" element={<AdminSupportPage />} />
              <Route
                path="/admin/teams"
                element={
                  <ProtectedRoute allowedRoles={["admin", "super_admin", "team_lead"]}>
                    <AdminTeamsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin/leave" element={<AdminLeavePage />} />
              <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={["admin", "super_admin", "investor_relations"]}>
                    <AdminReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kpi"
                element={
                  <ProtectedRoute allowedRoles={["admin", "super_admin", "investor_relations"]}>
                    <AdminReportsPage />
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
                element={
                  <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                    <AdminAddonsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/escalations"
                element={
                  <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                    <AdminEscalationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                    <AdminSettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Creative Team Kanban Workspace */}
              <Route path="/dashboard" element={<KanbanBoard actorRole="team_lead" />} />
              <Route path="/kanban" element={<KanbanBoard actorRole="team_lead" />} />
            </Route>

            {/* 6. System Smoke Test & Fallbacks */}
            <Route path="/health" element={<HealthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <MandatoryPasswordResetModal />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
