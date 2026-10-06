import { Outlet } from "react-router";
import { AdminBottomNav } from "./AdminBottomNav";
import { useRouteMemory } from "../../lib/useRouteMemory";
import { PortalWrapper } from "../common/AntigravityCanvas";
import { AdminSidebarProvider } from "../admin/AdminSidebarContext";
import { AdminSidebar } from "../admin/AdminSidebar";

export function OpsLayout() {
  // Passively save current route to sessionStorage on every navigation
  useRouteMemory();

  return (
    <PortalWrapper>
      <AdminSidebarProvider>
        <div className="min-h-screen w-full flex bg-[#0B111C]">
          {/* Permanent Desktop Sidebar (Always Visible) & Mobile Drawer */}
          <AdminSidebar />

          {/* Main Content Area: Offset on desktop to sit beside the permanent sidebar */}
          <div className="flex-1 min-w-0 md:pl-64 lg:pl-72 flex flex-col min-h-screen">
            <div className="flex-1 pb-20 lg:pb-0">
              <Outlet />
            </div>
            <AdminBottomNav />
          </div>
        </div>
      </AdminSidebarProvider>
    </PortalWrapper>
  );
}
