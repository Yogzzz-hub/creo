import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { useRouteMemory } from "../../lib/useRouteMemory";
import { PortalSidebarNew } from "./PortalSidebarNew";
import { AdminSidebarProvider } from "../admin/AdminSidebarContext";
import { AdminTopHeader } from "../admin/AdminTopHeader";
import { CreoInlineLoader } from "../ui/CreoLoader";
import { CreoBottomNavbar } from "./CreoBottomNavbar";
import { ResumeOnboardingBanner } from "./ResumeOnboardingBanner";

export function PortalLayout() {
  // Passively save current route to sessionStorage on every navigation
  useRouteMemory();
  const { pathname } = useLocation();
  // The dashboard and plan pages render the larger resume card themselves instead of the strip
  const hasHeroResume =
    pathname === "/portal" || pathname === "/portal/" || pathname.startsWith("/portal/payments");

  return (
    <AdminSidebarProvider>
      <div className="portal-dark bento-theme min-h-screen w-full flex bg-[#0B111C] text-[#F8FAFC]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-lg focus:bg-[#BCCCE6] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#0B111C] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#7FA0D6] focus:ring-offset-2"
        >
          Skip to content
        </a>

        {/* Permanent Desktop Sidebar (Always Visible) & Mobile Drawer */}
        <PortalSidebarNew />

        {/* Main Content Area: Offset on desktop to sit beside the permanent sidebar */}
        <div className="flex-1 min-w-0 xl:pl-[280px] flex flex-col min-h-screen">
          {/* Top Header with Hamburger (mobile), Page Title, Notification Bell & Profile */}
          <AdminTopHeader showBackButton />

          {/* Main Content Area — same gutters and max width as the header so everything lines up */}
          <main
            id="main-content"
            className="portal-main flex-1 w-full px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-10"
          >
            <div className="mx-auto w-full max-w-[1500px]">
              {!hasHeroResume && <ResumeOnboardingBanner variant="compact" />}
              <Suspense fallback={<CreoInlineLoader />}>
                <div key={pathname} className="animate-page-in">
                  <Outlet />
                </div>
              </Suspense>
            </div>
          </main>

          {/* Mobile Bottom Navigation Bar */}
          <CreoBottomNavbar />
        </div>
      </div>
    </AdminSidebarProvider>
  );
}
