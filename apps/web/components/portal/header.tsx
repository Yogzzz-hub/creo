"use client"

import { useState } from "react"
import { Bell, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Deliverable Ready",
    message: "Your Instagram reel \"Summer Fitness Tips\" is ready for review.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "2",
    title: "New Content Plan",
    message: "Your content plan for July has been uploaded. Please review and approve.",
    time: "5 hours ago",
    read: false,
  },
  {
    id: "3",
    title: "Ticket Update",
    message: "Support ticket #1042 has been resolved by the team.",
    time: "1 day ago",
    read: true,
  },
  {
    id: "4",
    title: "Payment Received",
    message: "Your payment of ₹4,999 for the Growth plan has been confirmed.",
    time: "3 days ago",
    read: true,
  },
]

export function PortalHeader() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const unreadCount = notifications.filter((n) => !n.read).length

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-sm lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[#0D2137]">Portal</h1>
      </div>

      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger
            render={
              <button className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700" />
            }
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0D2137]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-[#2B7BC4] hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={cn(
                      "flex cursor-pointer gap-3 border-b border-border/50 px-4 py-3 transition-colors last:border-b-0 hover:bg-gray-50",
                      !notification.read && "bg-[#E8F4FD]/50"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {!notification.read ? (
                        <span className="block size-2 rounded-full bg-[#2B7BC4]" />
                      ) : (
                        <Check className="size-4 text-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm",
                          !notification.read
                            ? "font-medium text-[#0D2137]"
                            : "text-gray-600"
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Avatar>
          <AvatarFallback>CL</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
