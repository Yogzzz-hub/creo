import { Suspense, useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { useRouteMemory } from "../../lib/useRouteMemory";
import { PortalSidebarNew } from "./PortalSidebarNew";
import { AdminSidebarProvider } from "../admin/AdminSidebarContext";
import { AdminTopHeader } from "../admin/AdminTopHeader";
import { CreoInlineLoader } from "../ui/CreoLoader";

import { ResumeOnboardingBanner } from "./ResumeOnboardingBanner";
import { useOnboardingGate } from "../../lib/useOnboardingGate";

export function PortalLayout() {
  // Passively save current route to sessionStorage on every navigation
  useRouteMemory();
  const { pathname } = useLocation();
  // Start each page below its header rather than retaining the previous page's scroll.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  const gate = useOnboardingGate();
  // Only an unlocked chat uses a fixed-height viewport; locked pages scroll normally.
  const isSlack = pathname.startsWith("/portal/slack") && gate.isComplete;

  return (
    <AdminSidebarProvider>
      <div
        className={
          isSlack
            ? "portal-dark bento-theme h-screen max-h-screen w-full flex bg-[#0B111C] text-[#F8FAFC] overflow-hidden"
            : "portal-dark bento-theme min-h-screen w-full flex bg-[#0B111C] text-[#F8FAFC]"
        }
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-lg focus:bg-[#BCCCE6] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#0B111C] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#7FA0D6] focus:ring-offset-2"
        >
          Skip to content
        </a>

        {/* Permanent Desktop Sidebar (Always Visible) & Mobile Drawer */}
        <PortalSidebarNew />

        {/* Main Content Area: Offset on desktop to sit beside the permanent sidebar */}
        <div
          className={
            isSlack
              ? "flex-1 min-w-0 xl:pl-[280px] flex flex-col h-screen max-h-screen overflow-hidden"
              : "flex-1 min-w-0 xl:pl-[280px] flex flex-col min-h-screen"
          }
        >
          {/* Keep navigation available below the desktop sidebar breakpoint. */}
          <div className="sticky top-0 z-40 shrink-0 xl:hidden">
            <AdminTopHeader showBackButton />
          </div>

          {/* Main Content Area — fixed height for Slack so internal scrollbars activate */}
          <main
            id="main-content"
            className={
              isSlack
                ? "portal-main flex-1 w-full px-4 sm:px-6 pt-4 pb-4 flex flex-col min-h-0 overflow-hidden"
                : "portal-main flex-1 w-full px-4 sm:px-6 pt-4 pb-6"
            }
          >
            <div
              className={
                isSlack
                  ? "portal-content mx-auto w-full max-w-[1500px] flex-1 min-h-0 flex flex-col h-full max-h-full overflow-hidden"
                  : "portal-content mx-auto flex w-full max-w-[1500px] flex-col gap-4"
              }
            >
              {!isSlack && pathname !== "/portal" && pathname !== "/portal/" && (
                <ResumeOnboardingBanner variant="compact" />
              )}
              <Suspense fallback={<CreoInlineLoader />}>
                <div
                  key={pathname}
                  className={
                    isSlack
                      ? "flex-1 min-h-0 flex flex-col h-full max-h-full overflow-hidden"
                      : "animate-page-in"
                  }
                >
                  <Outlet />
                </div>
              </Suspense>
            </div>
          </main>

          {/* Mobile Bottom Navigation Bar */}

        </div>
      </div>
    </AdminSidebarProvider>
  );
}
