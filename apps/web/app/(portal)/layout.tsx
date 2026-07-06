import { DesktopSidebar, MobileBottomTabBar } from "@/components/portal/sidebar"
import { PortalHeader } from "@/components/portal/header"
import { SessionProvider } from "@/context/session-context"
import { SubscriptionProvider } from "@/context/subscription-context"
import { SubscriptionGuard } from "@/components/portal/subscription-guard"
import { OnboardingGuard } from "@/components/portal/onboarding-guard"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <SubscriptionProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-lg focus:bg-[#2B7BC4] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:ring-offset-2"
        >
          Skip to content
        </a>
        <div className="min-h-screen bg-[#E8F4FD]">
          <DesktopSidebar />

          <div className="lg:pl-[--sidebar-width]">
            <PortalHeader />
            <SubscriptionGuard />

            <main
              id="main-content"
              className="px-4 py-6 pb-[calc(var(--bottomtab-height)+1.5rem)] lg:px-8 lg:py-8 lg:pb-8"
            >
              <OnboardingGuard>
                {children}
              </OnboardingGuard>
            </main>
          </div>

          <MobileBottomTabBar />
        </div>
      </SubscriptionProvider>
    </SessionProvider>
  )
}
