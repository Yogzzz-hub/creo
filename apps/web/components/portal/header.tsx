"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/portal/notification-bell"

export function PortalHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-sm lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[#0D2137]">Portal</h1>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <Avatar>
          <AvatarFallback>CL</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
