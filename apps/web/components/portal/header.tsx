"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/portal/notification-bell"
import { useSession } from "@/context/session-context"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, LifeBuoy, LogOut, Building2, Camera, Trash2 } from "lucide-react"

function resolveDisplayName(user_metadata: Record<string, unknown> | undefined, email: string | undefined): string {
  const meta = user_metadata as Record<string, string> | undefined;
  const name = meta?.full_name || meta?.name || meta?.display_name;
  if (name && name.trim().length > 0) return name.trim();
  if (email) return email.split("@")[0];
  return "User";
}

function getInitials(name: string): string {
  if (!name || name.trim().length === 0) return "U";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0][0].toUpperCase();
}

export function PortalHeader() {
  const { user: authUser } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loggingOut, setLoggingOut] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(authUser?.user_metadata?.avatar_url as string | undefined)
  const [displayName, setDisplayName] = useState(
    resolveDisplayName(authUser?.user_metadata as Record<string, unknown> | undefined, authUser?.email)
  )

  useEffect(() => {
    if (!authUser) return
    const meta = authUser.user_metadata as Record<string, string> | undefined
    setAvatarUrl(meta?.avatar_url ?? null)
    setDisplayName(resolveDisplayName(authUser.user_metadata as Record<string, unknown> | undefined, authUser.email))
  }, [authUser?.user_metadata, authUser?.email])

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        alert(`Upload Blocked by Supabase: ${uploadError.message}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) {
        alert(`Failed to save to profile: ${updateError.message}`);
        return;
      }

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      alert('Profile picture updated successfully!');

    } catch (error: any) {
      alert(`System Error: ${error.message}`);
    } finally {
      if (event.target) event.target.value = '';
    }
  }

  async function handleRemove() {
    try {
      const supabase = createClient();

      if (avatarUrl) {
        const rawUrl = avatarUrl.split('?')[0];
        const marker = '/avatars/';
        const idx = rawUrl.indexOf(marker);
        const filePath = idx !== -1
          ? decodeURIComponent(rawUrl.substring(idx + marker.length))
          : null;

        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('avatars')
            .remove([filePath]);
          if (storageError) {
            alert(`Failed to delete file: ${storageError.message}`);
            return;
          }
        }
      }

      const { error: metaError } = await supabase.auth.updateUser({
        data: { avatar_url: null },
      });
      if (metaError) {
        alert(`Failed to clear profile: ${metaError.message}`);
        return;
      }

      setAvatarUrl(null);
    } catch (err: any) {
      alert(`Error removing avatar: ${err.message}`);
    }
  }

  const resolvedName = resolveDisplayName(authUser?.user_metadata as Record<string, unknown> | undefined, authUser?.email)
  const initial = getInitials(displayName || resolvedName)
  const businessName = authUser?.user_metadata?.business_name as string | undefined

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
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName || "User"} />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64">
            <DropdownMenuLabel>
              <div className="relative inline-block mb-2">
                <Avatar className="size-16">
                  <AvatarImage src={avatarUrl ?? undefined} alt={displayName || "User"} />
                  <AvatarFallback className="text-xl">{initial}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }}
                  className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-600 shadow-sm transition-colors hover:bg-gray-200"
                >
                  <Camera size={14} />
                </button>
              </div>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('Remove your profile picture?')) {
                      handleRemove()
                    }
                  }}
                  className="mb-1 flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-red-600"
                >
                  <Trash2 size={12} />
                  Remove photo
                </button>
              )}
              <p className="text-sm font-semibold">{displayName || "User"}</p>
              <p className="text-xs font-normal text-gray-500">{authUser?.email ?? ""}</p>
              {businessName && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                  <Building2 className="size-3.5 shrink-0" />
                  <span className="truncate">Workspace: {businessName}</span>
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
    </header>
  )
}
