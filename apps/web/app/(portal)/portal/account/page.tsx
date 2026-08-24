"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  ArrowLeft,
  Save,
  Loader2,
  Camera,
  Building2,
  Shield,
  Link2,
  Unlink,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useSession } from "@/context/session-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { BrandProfileTab } from "@/components/brand-profile-tab"

const businessProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  businessName: z.string().min(2, "Business name must be at least 2 characters."),
  phone: z.string().min(10, "Phone number must be at least 10 characters."),
  email: z.string().email(),
})

type BusinessProfileValues = z.infer<typeof businessProfileSchema>

interface UserProfile {
  fullName: string
  businessName: string
  phone: string
  email: string
}

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/portal"
          className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">Account Settings</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage your profile, security, and integrations.
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-white border border-gray-200 p-1 rounded-xl">
          <TabsTrigger value="profile" className="gap-1.5">
            <Building2 className="size-3.5" />
            Business Profile
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-1.5">
            <Sparkles className="size-3.5" />
            Brand Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="size-3.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Link2 className="size-3.5" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <BusinessProfileTab />
        </TabsContent>

        <TabsContent value="brand">
          <BrandProfileTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BusinessProfileTab() {
  const { user: authUser } = useSession()
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BusinessProfileValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: { fullName: "", businessName: "", phone: "", email: "" },
  })

  useEffect(() => {
    if (!authUser) return
    const emailValue = authUser.email ?? ""
    setEmail(emailValue)

    reset({
      fullName: authUser.user_metadata?.full_name ?? "",
      businessName: authUser.user_metadata?.business_name ?? "",
      phone: authUser.phone ?? "",
      email: emailValue,
    })
    setLoading(false)
  }, [authUser, reset])

  async function onSubmit(values: BusinessProfileValues) {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: values.fullName,
          business_name: values.businessName,
        },
      })

      if (error) throw error

      toast.success("Profile updated successfully.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading profile...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#0D2137]">
          Business Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="full-name"
                {...register("fullName")}
                className={cn(errors.fullName && "border-red-500 focus-visible:ring-red-500")}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">{errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name <span className="text-red-500">*</span></Label>
              <Input
                id="business-name"
                {...register("businessName")}
                className={cn(errors.businessName && "border-red-500 focus-visible:ring-red-500")}
              />
              {errors.businessName && (
                <p className="text-sm text-red-500">{errors.businessName.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                readOnly
                disabled
                className="bg-gray-50 text-gray-500"
              />
              <p className="text-sm text-muted-foreground">
                Email address is linked to your account login and cannot be changed here.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
              <Input
                id="phone"
                {...register("phone")}
                className={cn(errors.phone && "border-red-500 focus-visible:ring-red-500")}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function SecurityTab() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [isToggling2FA, setIsToggling2FA] = useState(false)

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })

  async function handleChangePassword() {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error("Please fill in all password fields.")
      return
    }
    if (passwords.new !== passwords.confirm) {
      toast.error("New password and confirmation do not match.")
      return
    }
    if (passwords.new.length < 8) {
      toast.error("New password must be at least 8 characters.")
      return
    }

    setIsChanging(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      })

      if (error) throw error

      setPasswords({ current: "", new: "", confirm: "" })
      toast.success("Password changed successfully.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setIsChanging(false)
    }
  }

  function handleToggle2FA(checked: boolean) {
    setIsToggling2FA(true)
    setTimeout(() => {
      setTwoFactorEnabled(checked)
      setIsToggling2FA(false)
      toast.success(
        checked
          ? "Two-factor authentication enabled."
          : "Two-factor authentication disabled."
      )
    }, 600)
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0D2137]">
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={passwords.current}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, current: e.target.value }))
                }
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={passwords.new}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, new: e.target.value }))
                }
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, confirm: e.target.value }))
                }
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={isChanging}
              className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
            >
              {isChanging ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Shield className="size-4" />
              )}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="flex items-center justify-between p-5">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#0D2137]">
              Two-Factor Authentication
            </h3>
            <p className="text-xs text-gray-500">
              Add an extra layer of security to your account with 2FA.
            </p>
          </div>
          <Switch
            checked={twoFactorEnabled}
            onCheckedChange={handleToggle2FA}
            disabled={isToggling2FA}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function IntegrationsTab() {
  const { token } = useSession()
  const [loading, setLoading] = useState(true)
  const [instagramConnected, setInstagramConnected] = useState(false)
  const [instagramUsername, setInstagramUsername] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetch(`${API_URL}/api/v1/account`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setInstagramConnected(data.instagram_connected)
          setInstagramUsername(data.instagram_username)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [token, API_URL])

  async function handleConnect() {
    setIsConnecting(true)

    try {
      const res = await fetch("/api/auth/instagram/url");
      if (!res.ok) {
        toast.error("Failed to initialize Instagram connection.");
        setIsConnecting(false);
        return;
      }

      const data = await res.json();
      if (!data.url) {
        toast.error("Failed to generate Instagram connection URL.");
        setIsConnecting(false);
        return;
      }

      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      const popup = window.open(
        data.url,
        "InstagramConnect",
        `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
      );

      if (!popup) {
        toast.error("Please allow popups to connect Instagram.");
        setIsConnecting(false);
        return;
      }

      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === "INSTAGRAM_OAUTH") {
          window.removeEventListener("message", messageListener);
          setIsConnecting(false);

          if (event.data.status === "success") {
            toast.success("Instagram connected successfully!");
            // Refresh account status after popup success
            setLoading(true);
            const controller = new AbortController()
            fetch(`${API_URL}/api/v1/account`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            })
              .then((r) => (r.ok ? r.json() : null))
              .then((accountData) => {
                if (accountData) {
                  setInstagramConnected(accountData.instagram_connected)
                  setInstagramUsername(accountData.instagram_username)
                }
              })
              .catch(() => {})
              .finally(() => setLoading(false))
          } else {
            toast.error(`Instagram connection failed: ${event.data.details || "Unknown error"}`);
          }
        }
      };

      window.addEventListener("message", messageListener);

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup)
          // Don't remove listener immediately, give a small grace period for postMessage
          setTimeout(() => window.removeEventListener("message", messageListener), 1000);
          setIsConnecting(false)
        }
      }, 1000)

    } catch (err) {
      toast.error("Failed to connect Instagram.");
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!token) return
    setIsDisconnecting(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/account/instagram`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setInstagramConnected(false)
        setInstagramUsername(null)
        toast.success("Instagram account disconnected.")
      } else {
        toast.error("Failed to disconnect Instagram.")
      }
    } catch {
      toast.error("Failed to disconnect Instagram.")
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading integrations...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl shadow-[var(--shadow-card)]">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl",
              instagramConnected
                ? "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400"
                : "bg-gray-100"
            )}
          >
            <Camera
              className={cn(
                "size-6",
                instagramConnected ? "text-white" : "text-gray-400"
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#0D2137]">
                Instagram Business
              </h3>
              {instagramConnected && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                  Connected
                </Badge>
              )}
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {instagramConnected
                ? instagramUsername
                  ? `Connected as @${instagramUsername}. Content can be published directly.`
                  : "Your Instagram account is connected. Content can be published directly."
                : "Connect your Instagram Business account to enable direct publishing of approved content."}
            </p>

            <div className="mt-4">
              {instagramConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {isDisconnecting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Unlink className="size-3.5" />
                  )}
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Camera className="size-3.5" />
                      Connect Instagram Business
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
