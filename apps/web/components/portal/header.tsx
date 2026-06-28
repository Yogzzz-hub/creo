"use client"

import { useEffect, useRef, useState } from "react"
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
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loggingOut, setLoggingOut] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar_url)
  const [displayName, setDisplayName] = useState(user?.full_name || "")

  useEffect(() => {
    setAvatarUrl(user?.avatar_url)
    setDisplayName(resolveDisplayName(user as unknown as Record<string, unknown> | undefined, user?.email))
  }, [user?.avatar_url, user?.full_name, user?.email])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      console.log("Current User Metadata:", authUser?.user_metadata)
      console.log("User Email:", authUser?.email)
      if (authUser) {
        const name = resolveDisplayName(authUser.user_metadata, authUser.email)
        setUser({
          ...user!,
          full_name: name,
          business_name: authUser.user_metadata?.business_name ?? user?.business_name,
          avatar_url: authUser.user_metadata?.avatar_url ?? user?.avatar_url,
        })
        setDisplayName(name)
        setAvatarUrl(authUser.user_metadata?.avatar_url ?? user?.avatar_url)
      }
    })
  }, [user, setUser])

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
        console.log('No file selected.');
        return;
      }

      const file = event.target.files[0];
      console.log('Step 1: File selected:', file.name, 'Size:', file.size);

      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('User not found');
      console.log('Step 2: User found:', authUser.id);

      const fileExt = file.name.split('.').pop();
      const filePath = `${authUser.id}/avatar-${Date.now()}.${fileExt}`;
      console.log('Step 3: Uploading to:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload Error Details:', uploadError);
        alert(`Upload Blocked by Supabase: ${uploadError.message}`);
        return;
      }
      console.log('Step 4: Upload successful to storage');

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      console.log('Step 5: Public URL generated:', publicUrl);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) {
        console.error('Metadata Update Error:', updateError);
        alert(`Failed to save to profile: ${updateError.message}`);
        return;
      }
      console.log('Step 6: User metadata updated');

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      alert('Profile picture updated successfully!');

    } catch (error: any) {
      console.error('Unexpected Crash:', error);
      alert(`System Error: ${error.message}`);
    } finally {
      if (event.target) event.target.value = '';
    }
  }

  async function handleRemove() {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null },
      });
      if (error) {
        console.error('Remove avatar error:', error);
        return;
      }
      setAvatarUrl(undefined);
    } catch (err) {
      console.error('Unexpected error removing avatar:', err);
    }
  }

  const resolvedName = resolveDisplayName(user as unknown as Record<string, unknown> | undefined, user?.email)
  const initial = getInitials(displayName || resolvedName)

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
              <AvatarImage src={avatarUrl} alt={displayName || "User"} />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64">
            <DropdownMenuLabel>
              <div className="relative inline-block mb-2">
                <Avatar className="size-16">
                  <AvatarImage src={avatarUrl} alt={displayName || "User"} />
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
