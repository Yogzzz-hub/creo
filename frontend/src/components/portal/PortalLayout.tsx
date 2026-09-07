import { Outlet } from "react-router";
import { PortalSidebar, MobileBottomTabBar } from "./PortalSidebar";
import { PortalHeader } from "./PortalHeader";

export function PortalLayout() {
  return (
    <div className="h-screen overflow-hidden bg-[#E8F4FD] text-[#0D2137]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-lg focus:bg-[#2B7BC4] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:ring-offset-2"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar — fixed position, never scrolls */}
      <PortalSidebar />

      {/* Main Content Area — only this column scrolls */}
      <div className="lg:pl-[var(--sidebar-width)] h-screen flex flex-col overflow-hidden">
        <PortalHeader />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(var(--bottomtab-height)+1.5rem)] lg:px-8 lg:py-8 lg:pb-8 animate-page-in"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (56px fixed) */}
      <MobileBottomTabBar />
    </div>
  );
}

