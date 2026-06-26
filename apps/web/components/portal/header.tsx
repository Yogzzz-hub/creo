"use client"

import { useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/portal/notification-bell"
import { useAuthStore } from "@/store/auth"
import { createClient } from "@/lib/supabase/client"

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

  console.log("Full Name from Store:", user?.full_name)

  useEffect(() => {
    if (user && !user.full_name) {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          setUser({
            ...user,
            full_name: authUser.user_metadata?.full_name ?? user.full_name,
            avatar_url: authUser.user_metadata?.avatar_url ?? user.avatar_url,
          })
        }
      })
    }
  }, [user, setUser])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-sm lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[#0D2137]">Portal</h1>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <Avatar>
          <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
          <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
