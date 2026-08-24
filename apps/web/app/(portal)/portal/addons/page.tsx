"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { ShoppingCart, Plus, Minus, FileImage, Film, Layers, Loader2 } from "lucide-react"
import { useSession } from "@/context/session-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useSubscription } from "@/context/subscription-context"

interface ApiAddonPricing {
  id: string
  deliverable_type: string
  unit_price: number
  is_active: boolean
}

interface AddonType {
  id: string
  apiType: string
  name: string
  description: string
  unitPrice: number
  icon: typeof FileImage
  color: string
}

const ICON_MAP: Record<string, { icon: typeof FileImage; color: string; name: string; description: string }> = {
  poster: { icon: FileImage, color: "#2B7BC4", name: "Extra Poster", description: "Additional social media poster design for your campaign." },
  reel: { icon: Film, color: "#0EA5E9", name: "Extra Reel", description: "Short-form video content edited and ready to post." },
  story: { icon: Layers, color: "#6BAED6", name: "Extra Story", description: "Instagram/Facebook story design with animations." },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AddonsPage() {
  const { token, user } = useSession()
  const [addonTypes, setAddonTypes] = useState<AddonType[]>([])
  const [loading, setLoading] = useState(true)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const { isLapsed } = useSubscription()

  useEffect(() => {
    async function fetchPricing() {
      try {
        if (!token) {
          setLoading(false)
          return
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/addons/pricing`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (!res.ok) {
          setLoading(false)
          return
        }

        const data: ApiAddonPricing[] = await res.json()
        const mapped: AddonType[] = data
          .filter((p) => p.is_active)
          .map((p) => {
            const meta = ICON_MAP[p.deliverable_type] ?? ICON_MAP.poster
            return {
              id: p.id,
              apiType: p.deliverable_type,
              name: meta.name,
              description: meta.description,
              unitPrice: p.unit_price,
              icon: meta.icon,
              color: meta.color,
            }
          })

        setAddonTypes(mapped)
        const initial: Record<string, number> = {}
        mapped.forEach((a) => { initial[a.id] = 0 })
        setQuantities(initial)
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }
    fetchPricing()
  }, [token])

  function updateQuantity(id: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [id]: next }
    })
  }

  const totalItems = Object.values(quantities).reduce((sum, q) => sum + q, 0)
  const totalPrice = addonTypes.reduce((sum, addon) => {
    return sum + (quantities[addon.id] || 0) * addon.unitPrice
  }, 0)

  async function handlePurchase() {
    if (totalItems === 0) {
      toast.error("Please select at least one add-on.")
      return
    }

    if (!token) {
      toast.error("Not authenticated")
      return
    }

    setIsProcessing(true)
    try {
      const addonsToOrder = addonTypes.filter((a) => (quantities[a.id] || 0) > 0)

      const loadRazorpayScript = (): Promise<boolean> => {
        return new Promise((resolve) => {
          if (typeof window !== "undefined" && (window as any).Razorpay) {
            resolve(true)
            return
          }
          const existing = document.querySelector(
            'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
          )
          if (existing) {
            existing.addEventListener("load", () => resolve(true))
            return
          }
          const script = document.createElement("script")
          script.src = "https://checkout.razorpay.com/v1/checkout.js"
          script.onload = () => resolve(true)
          script.onerror = () => resolve(false)
          document.body.appendChild(script)
        })
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay. Please check your connection.")
        setIsProcessing(false)
        return
      }

      const orderRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/create-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: totalPrice,
            currency: "INR",
            receipt: `addon_${token.slice(0, 8)}`,
            notes: {
              items: addonsToOrder.map((a) => ({
                type: a.apiType,
                qty: quantities[a.id] || 0,
              })),
            },
          }),
        }
      )

      if (!orderRes.ok) {
        const body = await orderRes.json().catch(() => ({}))
        throw new Error(body.detail || "Failed to create payment order")
      }

      const orderData = await orderRes.json()

      const rzp = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: "Creo",
        description: "Add-on Purchase",
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const batchPayload = {
              items: addonsToOrder.map((a) => ({
                deliverable_type: a.apiType,
                quantity: quantities[a.id] || 0,
              })),
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }

            const purchaseRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/v1/addons/purchase-batch`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(batchPayload),
              }
            )

            if (!purchaseRes.ok) {
              const body = await purchaseRes.json().catch(() => ({}))
              throw new Error(body.detail || "Failed to confirm addon purchase")
            }

            const resetQuantities: Record<string, number> = {}
            addonTypes.forEach((a) => { resetQuantities[a.id] = 0 })
            setQuantities(resetQuantities)
            toast.success("Payment successful! Add-on tasks created.")
          } catch (err: any) {
            toast.error(err instanceof Error ? err.message : "Purchase failed")
          } finally {
            setIsProcessing(false)
          }
        },
        prefill: {
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: { color: "#2B7BC4" },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
          },
        },
      })

      rzp.open()
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Purchase failed")
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="size-4 animate-spin" />
          Loading add-on pricing...
        </div>
      </div>
    )
  }

  if (addonTypes.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">Add-ons</h1>
          <p className="mt-1 text-sm text-gray-500">
            Purchase additional content beyond your plan quota.
          </p>
        </div>
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="size-12 text-gray-300" />
            <h3 className="mt-4 text-base font-semibold text-[#0D2137]">
              No add-ons available right now
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Check back later for additional content options.
            </p>
          </CardContent>
        </Card>
      </div>
    )
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
          {addonTypes.map((addon) => {
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
              {addonTypes.map((addon) => {
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
                disabled={isProcessing || totalItems === 0 || isLapsed}
                className={cn(
                  "mt-2 w-full bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90",
                  (totalItems === 0 || isLapsed) && "cursor-not-allowed opacity-50"
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
