"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/portal/notification-bell"
import { useAuthStore } from "@/store/auth"

function getInitials(name: string | undefined): string {
  if (!name) return "U"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0][0].toUpperCase()
}

export function PortalHeader() {
  const user = useAuthStore((s) => s.user)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-sm lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[#0D2137]">Portal</h1>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <Link href="/portal/account">
          <Avatar>
            <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
            <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
