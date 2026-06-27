"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/portal/notification-bell"
import { useAuthStore } from "@/store/auth"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, LifeBuoy, LogOut, Building2 } from "lucide-react"

const getInitials = (name: string | undefined | null) => {
  if (!name || name.trim().length === 0) return "U";

  const words = name.trim().split(/\s+/);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0][0].toUpperCase();
};

export function PortalHeader() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  console.log("Full Name from Store:", user?.full_name)

  useEffect(() => {
    if (user && (!user.full_name || !user.business_name)) {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          setUser({
            ...user,
            full_name: authUser.user_metadata?.full_name ?? user.full_name,
            business_name: authUser.user_metadata?.business_name ?? user.business_name,
            avatar_url: authUser.user_metadata?.avatar_url ?? user.avatar_url,
          })
        }
      })
    }
  }, [user, setUser])

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-sm lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[#0D2137]">Portal</h1>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="relative rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-[#2B7BC4] focus-visible:ring-offset-2" />
            }
          >
            <Avatar>
              <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
              <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold">{user?.full_name ?? "User"}</p>
              <p className="text-xs font-normal text-gray-500">{user?.email ?? ""}</p>
              {user?.business_name && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                  <Building2 className="size-3.5 shrink-0" />
                  <span className="truncate">Workspace: {user.business_name}</span>
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/portal/account")}>
              <Settings className="size-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/portal/support")}>
              <LifeBuoy className="size-4" />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="size-4" />
              {loggingOut ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
