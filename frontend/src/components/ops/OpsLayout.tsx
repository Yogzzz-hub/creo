import { Suspense } from "react";
import { CreoInlineLoader } from "../ui/CreoLoader";
import { Outlet, useLocation } from "react-router";
import { useRouteMemory } from "../../lib/useRouteMemory";
import { PortalWrapper } from "../common/AntigravityCanvas";
import { AdminSidebarProvider } from "../admin/AdminSidebarContext";
import { AdminSidebar } from "../admin/AdminSidebar";

import { SimpleErrorBoundary } from "../ui/SimpleErrorBoundary";

export function OpsLayout() {
  // Passively save current route to sessionStorage on every navigation
  useRouteMemory();
  const { pathname } = useLocation();
  const isSlack = pathname.includes("/slack");

  return (
    <PortalWrapper>
      <AdminSidebarProvider>
        <div className={isSlack ? "h-screen max-h-screen w-full flex bg-[#0B111C] overflow-hidden" : "min-h-screen w-full flex bg-[#0B111C]"}>
          {/* Permanent Desktop Sidebar (Always Visible) & Mobile Drawer */}
          <AdminSidebar />

          <div className={isSlack ? "flex-1 min-w-0 lg:pl-[280px] flex flex-col h-screen max-h-screen overflow-hidden" : "flex-1 min-w-0 lg:pl-[280px] flex flex-col min-h-screen"}>
            <div className={isSlack ? "flex-1 min-h-0 flex flex-col overflow-hidden p-2 sm:p-3" : "flex-1"}>
              <SimpleErrorBoundary name="Admin Operations">
                <Suspense fallback={<CreoInlineLoader label="Loading workspace" />}><Outlet /></Suspense>
              </SimpleErrorBoundary>
            </div>
          </div>
        </div>
      </AdminSidebarProvider>
    </PortalWrapper>
  );
}
