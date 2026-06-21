"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) return

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )

      if (res.ok) {
        const data: Notification[] = await res.json()
        setNotifications(data)
      }
    } catch {
      // Silent fail — show empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  async function markAsRead(id: string) {
    const prev = notifications
    setNotifications((p) =>
      p.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) return

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
    } catch {
      setNotifications(prev)
    }
  }

  async function markAllAsRead() {
    const prev = notifications
    setNotifications((p) => p.map((n) => ({ ...n, is_read: true })))

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) return

      const unread = prev.filter((n) => !n.is_read)
      await Promise.all(
        unread.map((n) =>
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/${n.id}/read`,
            {
              method: "PATCH",
              headers: { Authorization: `Bearer ${session.access_token}` },
            }
          )
        )
      )
    } catch {
      setNotifications(prev)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No notifications yet.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "group flex gap-3 border-b border-border/50 px-4 py-3 transition-colors last:border-b-0 hover:bg-gray-50",
                  !notification.is_read && "bg-[#E8F4FD]/50"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {!notification.is_read ? (
                    <span className="block size-2 rounded-full bg-[#2B7BC4]" />
                  ) : (
                    <Check className="size-4 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm",
                      !notification.is_read
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
                    {timeAgo(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100"
                    title="Mark as read"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
