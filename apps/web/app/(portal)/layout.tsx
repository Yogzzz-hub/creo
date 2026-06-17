import { DesktopSidebar, MobileBottomTabBar } from "@/components/portal/sidebar"
import { PortalHeader } from "@/components/portal/header"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#E8F4FD]">
      <DesktopSidebar />

      <div className="lg:pl-[--sidebar-width]">
        <PortalHeader />

        <main
          className="px-4 py-6 pb-[calc(var(--bottomtab-height)+1.5rem)] lg:px-8 lg:py-8 lg:pb-8"
        >
          {children}
        </main>
      </div>

      <MobileBottomTabBar />
    </div>
  )
}
