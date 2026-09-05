"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, Loader2, Settings, Users, Bell, CreditCard, Globe } from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

interface PlatformSettings {
  id: string
  sla_delivery_days: number
  sla_revision_hours: number
  updated_at: string | null
}

interface UserManagement {
  user_id: string
  email: string
  role: string
  status: string
  last_login: string | null
}

interface NotificationSettings {
  email_notifications: boolean
  whatsapp_notifications: boolean
  ticket_escalation_alerts: boolean
  payment_failure_alerts: boolean
}

interface PaymentConfig {
  razorpay_enabled: boolean
  stripe_enabled: boolean
  auto_invoice: boolean
  payment_reminder_days: number
}

interface GeneralSettings {
  agency_name: string
  support_email: string
  support_phone: string
  business_hours: string
  timezone: string
}

function EditableSettingRow({
  label,
  value,
  onSave,
  saving,
}: {
  label: string
  value: string
  onSave: (val: string) => void
  saving: boolean
}) {
  const [local, setLocal] = useState(value)
  const [dirty, setDirty] = useState(false)

  useEffect(() => { setLocal(value) }, [value])

  return (
    <div className="flex items-center gap-3">
      <Label className="w-[220px] shrink-0 text-sm text-muted-foreground">{label}</Label>
      <Input value={local} onChange={(e) => { setLocal(e.target.value); setDirty(true) }} className="h-8 max-w-[200px]" />
      {dirty && (
        <Button variant="ghost" size="sm" disabled={saving} onClick={() => { onSave(local); setDirty(false) }}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [users, setUsers] = useState<UserManagement[]>([])
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    email_notifications: true,
    whatsapp_notifications: true,
    ticket_escalation_alerts: true,
    payment_failure_alerts: true,
  })
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    razorpay_enabled: true,
    stripe_enabled: false,
    auto_invoice: true,
    payment_reminder_days: 3,
  })
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    agency_name: "Creo Digital Marketing",
    support_email: "support@getcreo.in",
    support_phone: "+91 9941999415",
    business_hours: "Mon-Fri, 10AM-7PM IST",
    timezone: "Asia/Kolkata",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      adminFetch<PlatformSettings>("/api/v1/admin/settings"),
      adminFetch<UserManagement[]>("/api/v1/admin/settings/users"),
    ])
      .then(([settingsRes, usersRes]) => {
        if (settingsRes.status === "fulfilled") setSettings(settingsRes.value)
        if (usersRes.status === "fulfilled") setUsers(usersRes.value)
        const failures = [settingsRes, usersRes].filter((r) => r.status === "rejected")
        if (failures.length === 2) setError("Failed to load settings")
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  async function handleSave(field: string, value: string) {
    setSaving(true)
    try {
      const numValue = parseInt(value.replace(/\D/g, ""), 10)
      if (isNaN(numValue)) { toast.error("Invalid number"); return }
      const payload: Record<string, number> = {}
      if (field === "sla_delivery_days") payload.sla_delivery_days = numValue
      if (field === "sla_revision_hours") payload.sla_revision_hours = numValue

      const updated = await adminFetch<PlatformSettings>("/api/v1/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      setSettings(updated)
      toast.success("Setting saved", { description: `${field.replace(/_/g, " ")} updated to ${value}` })
    } catch (err) {
      toast.error("Failed to save", { description: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNotification(key: keyof NotificationSettings, value: boolean) {
    setNotifSettings((prev) => ({ ...prev, [key]: value }))
    try {
      await adminFetch("/api/v1/admin/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      })
      toast.success("Notification setting saved")
    } catch (err) {
      toast.error("Failed to save", { description: err instanceof Error ? err.message : "Unknown error" })
      setNotifSettings((prev) => ({ ...prev, [key]: !value }))
    }
  }

  async function handleSavePayment(key: keyof PaymentConfig, value: boolean | number) {
    setPaymentConfig((prev) => ({ ...prev, [key]: value }))
    try {
      await adminFetch("/api/v1/admin/settings/payment", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      })
      toast.success("Payment setting saved")
    } catch (err) {
      toast.error("Failed to save", { description: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  async function handleSaveGeneral() {
    setSaving(true)
    try {
      await adminFetch("/api/v1/admin/settings/general", {
        method: "PATCH",
        body: JSON.stringify(generalSettings),
      })
      toast.success("General settings saved")
    } catch (err) {
      toast.error("Failed to save", { description: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Platform configuration, user management, and preferences
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <Tabs defaultValue="platform">
          <TabsList variant="line">
            <TabsTrigger value="platform">Platform Settings</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="payment">Payment Config</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#0D2137]">Service Level Agreements</CardTitle>
                <CardDescription>Configure delivery and revision timelines</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <EditableSettingRow
                    label="Standard Delivery Time (days)"
                    value={String(settings?.sla_delivery_days ?? 3)}
                    onSave={(v) => handleSave("sla_delivery_days", v)}
                    saving={saving}
                  />
                  <EditableSettingRow
                    label="Revision Turnaround (hours)"
                    value={String(settings?.sla_revision_hours ?? 48)}
                    onSave={(v) => handleSave("sla_revision_hours", v)}
                    saving={saving}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#0D2137]">User Management</CardTitle>
                <CardDescription>Manage platform users and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            <p className="text-sm text-muted-foreground">No users found.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell className="font-medium text-[#0D2137]">{user.email}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
                                {user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                                user.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"
                              }`}>
                                {user.status}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {user.last_login ? new Date(user.last_login).toLocaleDateString("en-IN") : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">Edit</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#0D2137]">Notification Settings</CardTitle>
                <CardDescription>Configure how notifications are sent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { key: "email_notifications" as const, label: "Email Notifications", desc: "Send notifications via email" },
                    { key: "whatsapp_notifications" as const, label: "WhatsApp Notifications", desc: "Send notifications via WhatsApp" },
                    { key: "ticket_escalation_alerts" as const, label: "Ticket Escalation Alerts", desc: "Alert when tickets are escalated" },
                    { key: "payment_failure_alerts" as const, label: "Payment Failure Alerts", desc: "Alert when payments fail" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm font-medium text-[#0D2137]">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifSettings[item.key]}
                        onCheckedChange={(checked) => handleSaveNotification(item.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#0D2137]">Payment Configuration</CardTitle>
                <CardDescription>Configure payment gateways and billing settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium text-[#0D2137]">Razorpay</p>
                      <p className="text-xs text-muted-foreground">Enable Razorpay for Indian payments</p>
                    </div>
                    <Switch checked={paymentConfig.razorpay_enabled} onCheckedChange={(checked) => handleSavePayment("razorpay_enabled", checked)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium text-[#0D2137]">Stripe</p>
                      <p className="text-xs text-muted-foreground">Enable Stripe for international payments</p>
                    </div>
                    <Switch checked={paymentConfig.stripe_enabled} onCheckedChange={(checked) => handleSavePayment("stripe_enabled", checked)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium text-[#0D2137]">Auto Invoice</p>
                      <p className="text-xs text-muted-foreground">Automatically generate invoices</p>
                    </div>
                    <Switch checked={paymentConfig.auto_invoice} onCheckedChange={(checked) => handleSavePayment("auto_invoice", checked)} />
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <Label className="w-[250px] shrink-0 text-sm text-muted-foreground">Payment Reminder (days before)</Label>
                    <Input
                      type="number"
                      value={paymentConfig.payment_reminder_days}
                      onChange={(e) => handleSavePayment("payment_reminder_days", parseInt(e.target.value, 10) || 0)}
                      className="h-8 max-w-[100px]"
                      min={0}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#0D2137]">General Agency Settings</CardTitle>
                <CardDescription>Basic information about your agency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Agency Name</Label>
                    <Input value={generalSettings.agency_name} onChange={(e) => setGeneralSettings({ ...generalSettings, agency_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Support Email</Label>
                      <Input type="email" value={generalSettings.support_email} onChange={(e) => setGeneralSettings({ ...generalSettings, support_email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Support Phone</Label>
                      <Input value={generalSettings.support_phone} onChange={(e) => setGeneralSettings({ ...generalSettings, support_phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Business Hours</Label>
                      <Input value={generalSettings.business_hours} onChange={(e) => setGeneralSettings({ ...generalSettings, business_hours: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select value={generalSettings.timezone} onValueChange={(v) => setGeneralSettings({ ...generalSettings, timezone: v ?? "Asia/Kolkata" })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveGeneral} disabled={saving}>
                      {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Save General Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
