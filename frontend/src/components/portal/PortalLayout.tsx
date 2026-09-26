import { Outlet } from "react-router";
import { CreoTopNavbar } from "./CreoTopNavbar";
import { CreoBottomNavbar } from "./CreoBottomNavbar";
import { CreoFooter } from "./CreoFooter";
import { useRouteMemory } from "../../lib/useRouteMemory";

export function PortalLayout() {
  // Passively save current route to sessionStorage on every navigation
  useRouteMemory();

  return (
    <div className="min-h-screen flex flex-col bg-[#0B111C] text-[#F8FAFC] pb-[72px] xl:pb-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-lg focus:bg-[#BCCCE6] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#0B111C] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#7FA0D6] focus:ring-offset-2"
      >
        Skip to content
      </a>

      {/* Top Navigation Bar */}
      <CreoTopNavbar />

      {/* Main Content Area — wide bento grid, scrolls naturally */}
      <main
        id="main-content"
        className="portal-main flex-1 w-full px-0 pt-24 pb-24 xl:pb-7 animate-page-in"
      >
        <Outlet />
      </main>

      {/* Footer */}
      <div className="pb-16 xl:pb-0">
        <CreoFooter />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <CreoBottomNavbar />
    </div>
  );
}

