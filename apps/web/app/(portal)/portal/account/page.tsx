"use client"

import { useState } from "react"
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
} from "lucide-react"
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
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    businessName: "FitZone Studios",
    industry: "Fitness & Wellness",
    targetAudience: "Gen-Z fitness enthusiasts, ages 18-28, urban areas",
    brandTone: "Energetic, motivational, conversational",
    website: "https://fitzonestudios.in",
    phone: "+91 98765 43210",
  })

  function handleSave() {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success("Profile updated successfully.")
    }, 800)
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="rounded-xl shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#0D2137]">
          Business Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input
              id="business-name"
              value={form.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={form.industry}
              onChange={(e) => updateField("industry", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-audience">Target Audience</Label>
          <Textarea
            id="target-audience"
            rows={3}
            className="resize-none"
            value={form.targetAudience}
            onChange={(e) => updateField("targetAudience", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand-tone">Brand Tone</Label>
          <Textarea
            id="brand-tone"
            rows={2}
            className="resize-none"
            value={form.brandTone}
            onChange={(e) => updateField("brandTone", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
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

  function handleChangePassword() {
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
    setTimeout(() => {
      setIsChanging(false)
      setPasswords({ current: "", new: "", confirm: "" })
      toast.success("Password changed successfully.")
    }, 800)
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
  const [instagramConnected, setInstagramConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  function handleConnect() {
    setIsConnecting(true)
    setTimeout(() => {
      setInstagramConnected(true)
      setIsConnecting(false)
      toast.success("Instagram account connected successfully.")
    }, 1500)
  }

  function handleDisconnect() {
    setInstagramConnected(false)
    toast.success("Instagram account disconnected.")
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
                ? "Your Instagram account is connected. Content can be published directly."
                : "Connect your Instagram Business account to enable direct publishing of approved content."}
            </p>

            {instagramConnected && (
              <p className="mt-2 text-xs text-gray-600">
                Connected as{" "}
                <span className="font-medium text-[#0D2137]">@creo_client</span>
              </p>
            )}

            <div className="mt-4">
              {instagramConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Unlink className="size-3.5" />
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
