"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ShoppingCart, Plus, Minus, FileImage, Film, Layers, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface AddonType {
  id: string
  name: string
  description: string
  unitPrice: number
  icon: typeof FileImage
  color: string
}

const ADDON_TYPES: AddonType[] = [
  {
    id: "poster",
    name: "Extra Poster",
    description: "Additional social media poster design for your campaign.",
    unitPrice: 499,
    icon: FileImage,
    color: "#2B7BC4",
  },
  {
    id: "reel",
    name: "Extra Reel",
    description: "Short-form video content edited and ready to post.",
    unitPrice: 999,
    icon: Film,
    color: "#0EA5E9",
  },
  {
    id: "story",
    name: "Extra Story",
    description: "Instagram/Facebook story design with animations.",
    unitPrice: 349,
    icon: Layers,
    color: "#6BAED6",
  },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AddonsPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({
    poster: 0,
    reel: 0,
    story: 0,
  })
  const [isProcessing, setIsProcessing] = useState(false)

  function updateQuantity(id: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [id]: next }
    })
  }

  const totalItems = Object.values(quantities).reduce((sum, q) => sum + q, 0)
  const totalPrice = ADDON_TYPES.reduce((sum, addon) => {
    return sum + (quantities[addon.id] || 0) * addon.unitPrice
  }, 0)

  function handlePurchase() {
    if (totalItems === 0) {
      toast.error("Please select at least one add-on.")
      return
    }

    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setQuantities({ poster: 0, reel: 0, story: 0 })
      toast.success("Payment successful. Add-on tasks created.")
    }, 1500)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">Add-ons</h1>
        <p className="mt-1 text-sm text-gray-500">
          Purchase additional content beyond your plan quota.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADDON_TYPES.map((addon) => {
            const qty = quantities[addon.id] || 0
            return (
              <Card
                key={addon.id}
                className={cn(
                  "rounded-xl shadow-[var(--shadow-card)] transition-all",
                  qty > 0 && "ring-2 ring-[#2B7BC4]/30"
                )}
              >
                <CardContent className="flex flex-col p-5">
                  <div
                    className="flex size-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${addon.color}15` }}
                  >
                    <addon.icon className="size-6" style={{ color: addon.color }} />
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-[#0D2137]">
                    {addon.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    {addon.description}
                  </p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-xl font-bold text-[#0D2137]">
                      {formatCurrency(addon.unitPrice)}
                    </span>
                    <span className="text-xs text-gray-500">/ unit</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(addon.id, -1)}
                        disabled={qty === 0}
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg border border-gray-200 transition-colors",
                          qty === 0
                            ? "cursor-not-allowed text-gray-300"
                            : "text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-[#0D2137]">
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQuantity(addon.id, 1)}
                        className="flex size-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>

                    {qty > 0 && (
                      <span className="text-sm font-medium text-[#2B7BC4]">
                        {formatCurrency(qty * addon.unitPrice)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-xl shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0D2137]">
                <ShoppingCart className="size-4" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ADDON_TYPES.map((addon) => {
                const qty = quantities[addon.id] || 0
                if (qty === 0) return null
                return (
                  <div key={addon.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {addon.name} × {qty}
                    </span>
                    <span className="font-medium text-[#0D2137]">
                      {formatCurrency(qty * addon.unitPrice)}
                    </span>
                  </div>
                )
              })}

              {totalItems === 0 && (
                <p className="py-4 text-center text-sm text-gray-400">
                  No items selected yet.
                </p>
              )}

              {totalItems > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {totalItems} item{totalItems !== 1 ? "s" : ""}
                    </span>
                    <span className="text-lg font-bold text-[#0D2137]">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                </>
              )}

              <Button
                onClick={handlePurchase}
                disabled={isProcessing || totalItems === 0}
                className={cn(
                  "mt-2 w-full bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90",
                  totalItems === 0 && "cursor-not-allowed opacity-50"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="size-4" />
                    Pay Now
                  </>
                )}
              </Button>

              <p className="text-center text-[10px] text-gray-400">
                Charges added to your next invoice.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
