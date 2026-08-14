"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Megaphone, X } from "lucide-react"
import { useSession } from "@/context/session-context"
import { apiFetch } from "@/lib/api"

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  created_at: string
}

export function AnnouncementBanner() {
  const { user, loading } = useSession()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (loading || !user) return

    apiFetch("/api/v1/portal/announcements")
      .then((data) => {
        setAnnouncements(data as Announcement[])
      })
      .catch((err) => {
        console.error("Failed to fetch announcements:", err)
      })
  }, [user, loading])

  const handleDismiss = (id: string) => {
    setDismissed((prev) => ({ ...prev, [id]: true }))
  }

  if (loading || !user) return null
  if (announcements.length === 0) return null

  const activeAnnouncement = announcements.find((a) => !dismissed[a.id])

  if (!activeAnnouncement) return null

  const isMaintenance = activeAnnouncement.type === "maintenance"
  const Icon = isMaintenance ? AlertCircle : Megaphone

  const bgColor = isMaintenance ? "bg-red-50" : "bg-[#2B7BC4]"
  const textColor = isMaintenance ? "text-red-900" : "text-white"
  const iconColor = isMaintenance ? "text-red-600" : "text-white"
  const dismissColor = isMaintenance ? "text-red-700 hover:bg-red-100" : "text-white/80 hover:bg-white/20"

  return (
    <div className={`${bgColor} ${textColor} relative overflow-hidden transition-colors duration-300`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-x-6 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-x-3">
          <Icon className={`size-5 shrink-0 ${iconColor}`} aria-hidden="true" />
          <div className="text-sm leading-6">
            <strong className="font-semibold">{activeAnnouncement.title}</strong>
            <span className="mx-2">&middot;</span>
            {activeAnnouncement.content}
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleDismiss(activeAnnouncement.id)}
          className={`-m-1.5 flex-none p-1.5 rounded-md transition-colors ${dismissColor}`}
        >
          <span className="sr-only">Dismiss</span>
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
