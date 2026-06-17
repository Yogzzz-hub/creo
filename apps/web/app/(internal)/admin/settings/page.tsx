"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Save } from "lucide-react"
import { toast } from "sonner"

interface SettingRow {
  label: string
  value: string
}

function EditableSettingRow({
  label,
  value,
  onSave,
}: {
  label: string
  value: string
  onSave: (val: string) => void
}) {
  const [local, setLocal] = useState(value)
  const [dirty, setDirty] = useState(false)

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
          onClick={() => {
            onSave(local)
            setDirty(false)
            toast.success("Setting saved", {
              description: `${label} updated to "${local}"`,
            })
          }}
        >
          <Save className="size-3.5" />
          Save
        </Button>
      )}
    </div>
  )
}

const INITIAL_PRICING: SettingRow[] = [
  { label: "Starter — Monthly Price", value: "₹7,999" },
  { label: "Growth — Monthly Price", value: "₹14,999" },
  { label: "Pro — Monthly Price", value: "₹29,999" },
]

const INITIAL_ADDON_PRICING: SettingRow[] = [
  { label: "Poster — Add-on Price", value: "₹1,500" },
  { label: "Reel — Add-on Price", value: "₹2,500" },
  { label: "Story — Add-on Price", value: "₹1,000" },
]

const INITIAL_SLA: SettingRow[] = [
  { label: "Standard Delivery Time", value: "3 days" },
  { label: "Revision Turnaround", value: "24 hours" },
]

const INITIAL_MISC: SettingRow[] = [
  { label: "Scarcity Counter (Public Page)", value: "5 slots remaining" },
]

export default function SettingsPage() {
  const [pricing, setPricing] = useState(INITIAL_PRICING)
  const [addonPricing, setAddonPricing] = useState(INITIAL_ADDON_PRICING)
  const [sla, setSla] = useState(INITIAL_SLA)
  const [misc, setMisc] = useState(INITIAL_MISC)

  function updateRow(
    setter: React.Dispatch<React.SetStateAction<SettingRow[]>>,
    idx: number,
    newVal: string
  ) {
    setter((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, value: newVal } : r))
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">
          Platform Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage pricing, SLAs, and platform configuration
        </p>
      </div>

      <Tabs defaultValue="pricing">
        <TabsList variant="line">
          <TabsTrigger value="pricing">Pricing & Plans</TabsTrigger>
          <TabsTrigger value="sla">System SLAs</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#0D2137]">
                Subscription Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pricing.map((row, idx) => (
                  <EditableSettingRow
                    key={idx}
                    label={row.label}
                    value={row.value}
                    onSave={(v) => updateRow(setPricing, idx, v)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#0D2137]">
                Add-on Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {addonPricing.map((row, idx) => (
                  <EditableSettingRow
                    key={idx}
                    label={row.label}
                    value={row.value}
                    onSave={(v) => updateRow(setAddonPricing, idx, v)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#0D2137]">
                Public Page Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {misc.map((row, idx) => (
                  <EditableSettingRow
                    key={idx}
                    label={row.label}
                    value={row.value}
                    onSave={(v) => updateRow(setMisc, idx, v)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#0D2137]">
                Service Level Agreements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sla.map((row, idx) => (
                  <EditableSettingRow
                    key={idx}
                    label={row.label}
                    value={row.value}
                    onSave={(v) => updateRow(setSla, idx, v)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
