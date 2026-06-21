"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

interface PlatformSettings {
  id: string
  sla_delivery_days: number
  sla_revision_hours: number
  updated_at: string | null
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

  useEffect(() => {
    setLocal(value)
  }, [value])

  return (
    <div className="flex items-center gap-3">
      <Label className="w-[220px] shrink-0 text-sm text-muted-foreground">
        {label}
      </Label>
      <Input
        value={local}
        onChange={(e) => {
          setLocal(e.target.value)
          setDirty(true)
        }}
        className="h-8 max-w-[200px]"
      />
      {dirty && (
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => {
            onSave(local)
            setDirty(false)
          }}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save
        </Button>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(() => {
    setLoading(true)
    setError(null)
    adminFetch<PlatformSettings>("/api/v1/admin/settings")
      .then(setSettings)
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
      if (isNaN(numValue)) {
        toast.error("Invalid number")
        return
      }
      const payload: Record<string, number> = {}
      if (field === "sla_delivery_days") payload.sla_delivery_days = numValue
      if (field === "sla_revision_hours") payload.sla_revision_hours = numValue

      const updated = await adminFetch<PlatformSettings>("/api/v1/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      setSettings(updated)
      toast.success("Setting saved", {
        description: `${field.replace(/_/g, " ")} updated to ${value}`,
      })
    } catch (err) {
      toast.error("Failed to save", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">
          Platform Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage SLAs and platform configuration
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <Tabs defaultValue="sla">
          <TabsList variant="line">
            <TabsTrigger value="sla">System SLAs</TabsTrigger>
          </TabsList>

          <TabsContent value="sla" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#0D2137]">
                  Service Level Agreements
                </CardTitle>
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
        </Tabs>
      )}
    </div>
  )
}
