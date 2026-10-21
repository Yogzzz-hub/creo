import { Suspense, useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { useRouteMemory } from "../../lib/useRouteMemory";
import { PortalSidebarNew } from "./PortalSidebarNew";
import { AdminSidebarProvider } from "../admin/AdminSidebarContext";
import { AdminTopHeader } from "../admin/AdminTopHeader";
import { CreoInlineLoader } from "../ui/CreoLoader";

import { ResumeOnboardingBanner } from "./ResumeOnboardingBanner";
import { PortalPageHeader } from "./PortalPieces";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import "../../styles/portal-theme.css";

/**
 * Display headers for the pages that don't open with their own. Home and Plan &
 * billing build theirs in-page; tickets and chat run edge to edge.
 */
const PAGE_HEADERS: { path: string; eyebrow: string; title: string; lead: string; width?: string }[] = [
  {
    path: "/portal/deliverables",
    eyebrow: "Review",
    title: "Ready for your review.",
    lead: "Approve in one click, or decline with a note and your pod revises within your plan's quota.",
  },
  {
    path: "/portal/calendar",
    eyebrow: "Calendar",
    title: "Your content calendar.",
    lead: "Every post your pod has planned, day by day, from concept to publish.",
  },
  {
    path: "/portal/library",
    eyebrow: "Library",
    title: "Everything we've made.",
    lead: "Approved reels, carousels and stories with their captions, ready to download.",
  },
  {
    path: "/portal/brand",
    eyebrow: "Brand DNA",
    title: "Your Brand DNA.",
    lead: "The voice, palette and rules your pod works from on every piece.",
  },
  {
    path: "/portal/support",
    eyebrow: "Help",
    title: "How can we help?",
    lead: "Raise a ticket about a batch, your plan or the portal, and your pod picks it up.",
    width: "max-w-6xl mx-auto",
  },
  {
    path: "/portal/account",
    eyebrow: "Settings",
    title: "Your account.",
    lead: "Profile, company details, security and your Instagram connection.",
    width: "max-w-6xl mx-auto",
  },
];

function headerFor(pathname: string) {
  const clean = pathname.replace(/\/$/, "");
  return PAGE_HEADERS.find((h) =>
    // Ticket threads (/portal/support/:id) open with their own header
    h.path === "/portal/support" ? clean === h.path : clean === h.path || clean.startsWith(`${h.path}/`) || clean.startsWith(`${h.path}-`),
  );
}

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
  const pageHeader = isSlack ? undefined : headerFor(pathname);

  // The portal palette lives on <html> so dialogs portalled to <body> share it
  useLayoutEffect(() => {
    document.documentElement.classList.add("portal-theme");
    return () => document.documentElement.classList.remove("portal-theme");
  }, []);

  return (
    <AdminSidebarProvider>
      <div
        className={
          isSlack
            ? "portal-dark portal-site bento-theme h-screen max-h-screen w-full flex bg-app-base text-app-ink overflow-hidden"
            : "portal-dark portal-site bento-theme min-h-screen w-full flex bg-app-base text-app-ink"
        }
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-lg focus:bg-app-ink focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-app-base focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
        >
          Skip to content
        </a>

        {/* Permanent Desktop Sidebar (Always Visible) & Mobile Drawer */}
        <PortalSidebarNew />

        {/* Main Content Area: Offset on desktop to sit beside the permanent sidebar */}
        <div
          className={
            isSlack
              ? "flex-1 min-w-0 lg:pl-[280px] flex flex-col h-screen max-h-screen overflow-hidden"
              : "flex-1 min-w-0 lg:pl-[280px] flex flex-col min-h-screen overflow-x-hidden"
          }
        >
          {/* Top Header with Hamburger: kept in phone view, removed from desktop view */}
          <div className="lg:hidden">
            <AdminTopHeader />
          </div>

          {/* Main Content Area — fixed height for Slack so internal scrollbars activate */}
          <main
            id="main-content"
            className={
              isSlack
                ? "portal-main flex-1 w-full px-2 sm:px-4 lg:px-6 pt-1 sm:pt-2 pb-2 sm:pb-3 flex flex-col min-h-0 overflow-hidden"
                : "portal-main flex-1 w-full px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-12 pb-12 min-w-0 overflow-x-hidden"
            }
          >
            <div
              className={
                isSlack
                  ? "mx-auto w-full max-w-[1700px] flex-1 min-h-0 flex flex-col h-full max-h-full overflow-hidden"
                  : "mx-auto w-full max-w-[1400px] min-w-0"
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
                  {pageHeader && (
                    <div className={pageHeader.width}>
                      <PortalPageHeader eyebrow={pageHeader.eyebrow} title={pageHeader.title} lead={pageHeader.lead} />
                    </div>
                  )}
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
