"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  Home,
  LayoutDashboard,
  FileImage,
  CalendarDays,
  LifeBuoy,
  UserCog,
  CreditCard,
  LogOut,
} from "lucide-react"

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Deliverables", href: "/portal/deliverables", icon: FileImage },
  { label: "Calendar", href: "/portal/calendar", icon: CalendarDays },
  { label: "Payments", href: "/portal/payments", icon: CreditCard },
  { label: "Support", href: "/portal/support", icon: LifeBuoy },
  { label: "Account", href: "/portal/account", icon: UserCog },
]

const BOTTOM_TAB_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Deliverables", href: "/portal/deliverables", icon: FileImage },
  { label: "Calendar", href: "/portal/calendar", icon: CalendarDays },
  { label: "Support", href: "/portal/support", icon: LifeBuoy },
  { label: "Account", href: "/portal/account", icon: UserCog },
]

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/"
  if (href === "/portal") return pathname === "/portal"
  return pathname.startsWith(href)
}

export function DesktopSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[--sidebar-width] lg:flex-col">
      <div className="flex grow flex-col gap-y-6 bg-[#0D2137] px-4 pt-6 pb-4">
        <Link href="/portal" className="flex items-center gap-2 px-2">
          <span className="text-xl font-bold text-white tracking-tight">
            Creo
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-r-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D2137]",
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

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 rounded-r-lg px-3 py-2.5 text-sm font-medium border-l-[3px] border-transparent text-[#6BAED6] hover:bg-[#1a3a5c]/50 hover:text-white transition-colors mt-auto"
          >
            <LogOut className="size-4 shrink-0" />
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </nav>
      </div>
    </aside>
  )
}

export function MobileBottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-white px-1 lg:hidden"
      style={{ height: "var(--bottomtab-height)" }}
    >
      {BOTTOM_TAB_ITEMS.map((item) => {
        const active = isActive(item.href, pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-colors",
              active ? "text-[#2B7BC4]" : "text-gray-400"
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
