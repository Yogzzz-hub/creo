"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarDays,
  FileStack,
  CheckSquare,
  LifeBuoy,
  TrendingUp,
  Puzzle,
  BarChart3,
  Megaphone,
  Settings,
  Menu,
  LogOut,
  X,
} from "lucide-react"

const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Content Calendar", href: "/admin/calendar", icon: CalendarDays },
  { label: "Deliverables", href: "/admin/deliverables", icon: FileStack },
  { label: "Tasks", href: "/admin/tasks", icon: CheckSquare },
  { label: "Support Tickets", href: "/admin/support", icon: LifeBuoy },
  { label: "Sales & Pricing", href: "/admin/sales", icon: TrendingUp },
  { label: "Add-ons", href: "/admin/addons", icon: Puzzle },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "KPI Dashboard", href: "/admin/kpi", icon: BarChart3 },
  { label: "Team Management", href: "/admin/teams", icon: UserCog },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { label: "Settings", href: "/admin/settings", icon: Settings },
]

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname.startsWith(href)
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  function handleNavClick() {
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[var(--sidebar-width)] lg:flex-col">
        <div className="flex grow flex-col gap-y-6 bg-[#0D2137] px-4 pt-6 pb-4">
          <Link href="/admin" prefetch={true} className="flex items-center gap-2 px-2">
            <span className="text-xl font-bold text-white tracking-tight">
              Creo
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
                  prefetch={true}
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
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-r-lg border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-[#6BAED6] transition-colors hover:bg-[#1a3a5c]/50 hover:text-white"
            >
              <LogOut className="size-4 shrink-0" />
              Sign Out
            </button>
            <p className="mt-3 text-[10px] text-[#6BAED6] uppercase tracking-wider">
              Admin Panel
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] flex flex-col bg-[#0D2137]">
            <div className="flex items-center justify-between px-4 pt-6 pb-2">
              <Link href="/admin" prefetch={true} className="flex items-center gap-2" onClick={handleNavClick}>
                <span className="text-xl font-bold text-white tracking-tight">
                  Creo
                </span>
                <span className="ml-1 rounded bg-[#2B7BC4] px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase">
                  Admin
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1 text-[#6BAED6] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = isActive(item.href, pathname)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={handleNavClick}
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

            <div className="border-t border-[#1a3a5c] px-4 py-4">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-r-lg border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-[#6BAED6] transition-colors hover:bg-[#1a3a5c]/50 hover:text-white"
              >
                <LogOut className="size-4 shrink-0" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-[var(--sidebar-width)]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg text-[#0D2137] lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            {(() => {
              const currentNav = ADMIN_NAV_ITEMS.find(
                (item) => item.href !== "/admin" && isActive(item.href, pathname)
              )
              if (currentNav) {
                return (
                  <div className="flex items-center gap-2 text-sm sm:text-base">
                    <Link
                      href="/admin"
                      className="text-gray-400 hover:text-[#2B7BC4] font-medium transition-colors"
                    >
                      Admin
                    </Link>
                    <span className="text-gray-300">/</span>
                    <h1 className="text-base sm:text-lg font-semibold text-[#0D2137]">
                      {currentNav.label}
                    </h1>
                  </div>
                )
              }
              return <h1 className="text-lg font-semibold text-[#0D2137]">Admin</h1>
            })()}
          </div>
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
