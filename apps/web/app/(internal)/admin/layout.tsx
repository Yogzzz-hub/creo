"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarDays,
  AlertTriangle,
  TrendingUp,
  Puzzle,
  BarChart3,
  Megaphone,
  Settings,
  Activity,
} from "lucide-react"

const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Teams", href: "/admin/teams", icon: UserCog },
  { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
  { label: "Escalations", href: "/admin/escalations", icon: AlertTriangle },
  { label: "Sales", href: "/admin/sales", icon: TrendingUp },
  { label: "Add-ons", href: "/admin/addons", icon: Puzzle },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "KPI", href: "/kpi", icon: Activity },
]

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin"
  if (href === "/kpi") return pathname.startsWith("/kpi")
  return pathname.startsWith(href)
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[--sidebar-width] lg:flex-col">
        <div className="flex grow flex-col gap-y-6 bg-[#0D2137] px-4 pt-6 pb-4">
          <Link href="/admin" className="flex items-center gap-2 px-2">
            <span className="text-xl font-bold text-white tracking-tight">
              creo
            </span>
            <span className="ml-1 rounded bg-[#2B7BC4] px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase">
              Admin
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = isActive(item.href, pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-r-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "border-l-[3px] border-[#2B7BC4] bg-[#1a3a5c] text-white"
                      : "border-l-[3px] border-transparent text-[#6BAED6] hover:bg-[#1a3a5c]/50 hover:text-white"
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-[#1a3a5c] px-2 pt-4">
            <p className="text-[10px] text-[#6BAED6] uppercase tracking-wider">
              Admin Panel
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[--sidebar-width]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-4 lg:px-8">
          <h1 className="text-lg font-semibold text-[#0D2137]">Admin</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-[#2B7BC4] text-sm font-medium text-white">
                A
              </div>
              <span className="hidden text-sm font-medium text-[#0D2137] md:block">
                Admin User
              </span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
