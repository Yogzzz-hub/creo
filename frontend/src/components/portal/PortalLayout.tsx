import { Outlet } from "react-router";
import { CreoTopNavbar } from "./CreoTopNavbar";
import { CreoFooter } from "./CreoFooter";
import { useRouteMemory } from "../../lib/useRouteMemory";

export function PortalLayout() {
  // Passively save current route to sessionStorage on every navigation
  useRouteMemory();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] text-[#0F172A]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-lg focus:bg-[#0052FF] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0052FF] focus:ring-offset-2"
      >
        Skip to content
      </a>

      {/* Top Navigation Bar */}
      <CreoTopNavbar />

      {/* Main Content Area — wide bento grid, scrolls naturally */}
      <main
        id="main-content"
        className="flex-1 w-full px-0 pt-24 pb-7 animate-page-in"
      >
        <Outlet />
      </main>

      {/* Footer */}
      <CreoFooter />
    </div>
  );
}
