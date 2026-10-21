import { Suspense, useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { PlatformSidebarProvider } from "./PlatformSidebarContext";
import { PlatformSidebar } from "./PlatformSidebar";
import { AdminTopHeader } from "../admin/AdminTopHeader";
import { CreoInlineLoader } from "../ui/CreoLoader";
import { AdminSidebarProvider } from "../admin/AdminSidebarContext";

function PlatformLayoutInner() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="portal-dark bento-theme min-h-screen w-full flex bg-[#0B111C] text-[#F8FAFC]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-lg focus:bg-[#BCCCE6] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#0B111C] focus:shadow-lg focus:outline-none"
      >
        Skip to content
      </a>

      {/* Platform Sidebar */}
      <PlatformSidebar />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 lg:pl-[280px] flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile top header (hamburger) */}
        <div className="lg:hidden">
          <AdminTopHeader />
        </div>

        <main
          id="main-content"
          className="portal-main flex-1 w-full px-2.5 sm:px-5 lg:px-6 pt-2.5 sm:pt-4.5 lg:pt-5 pb-4 sm:pb-8 min-w-0 overflow-x-hidden"
        >
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            <Suspense fallback={<CreoInlineLoader />}>
              <div key={pathname} className="animate-page-in">
                <Outlet />
              </div>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export function PlatformLayout() {
  return (
    <AdminSidebarProvider>
      <PlatformSidebarProvider>
        <PlatformLayoutInner />
      </PlatformSidebarProvider>
    </AdminSidebarProvider>
  );
}
