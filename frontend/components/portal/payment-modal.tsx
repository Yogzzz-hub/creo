"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useSession } from "@/context/session-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CreditCard, Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"

type PlanSlug = "starter" | "growth" | "pro"
type Gateway = "razorpay" | "stripe"

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentSuccess?: () => void
  amount?: number
  description?: string
  receipt?: string
  notes?: Record<string, string>
}

const PLANS: Record<PlanSlug, { label: string; price: string; amount: number; features: string[] }> = {
  starter: {
    label: "Starter",
    price: "₹25,000",
    amount: 25000,
    features: ["5 social accounts", "20 posts/mo", "Basic analytics"],
  },
  growth: {
    label: "Growth",
    price: "₹50,000",
    amount: 50000,
    features: ["15 social accounts", "40 posts/mo", "Advanced analytics", "Dedicated manager"],
  },
  pro: {
    label: "Pro",
    price: "₹95,000",
    amount: 95000,
    features: ["Unlimited accounts", "60 posts/mo", "Advanced analytics", "Priority support"],
  },
}

const GATEWAY_LABELS: Record<Gateway, string> = {
  razorpay: "Connecting to Razorpay secure gateway...",
  stripe: "Initializing Stripe Checkout...",
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN").format(n)
}

export function PaymentModal({
  open,
  onOpenChange,
  onPaymentSuccess,
  amount = 25000,
  description = "Creo Plan Subscription",
  receipt,
  notes,
}: PaymentModalProps) {
  const { user, token: sessionToken } = useSession()
  const supabase = createClient()

  const [selectedMethod, setSelectedMethod] = useState<Gateway>("razorpay")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingGateway, setProcessingGateway] = useState<Gateway | null>(null)

  async function getAccessToken(): Promise<string | null> {
    if (sessionToken) return sessionToken
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  async function createRazorpayOrder(token: string): Promise<{
    order_id: string
    amount: number
    currency: string
    receipt: string
    key_id: string
  }> {
    const { getApiUrl } = await import("@/lib/api-url")
    const res = await fetch(
      `${getApiUrl()}/api/v1/payments/create-order`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: receipt || `order_${user?.id?.slice(0, 8) || "guest"}`,
          notes: notes || {},
        }),
      }
    )

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || "Failed to create payment order")
    }

    return res.json()
  }

  async function verifyPaymentOnBackend(
    token: string,
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    const { getApiUrl } = await import("@/lib/api-url")
    const res = await fetch(
      `${getApiUrl()}/api/v1/payments/verify-payment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          payment_id: paymentId,
          signature,
        }),
      }
    )

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || "Failed to verify payment")
    }

    const data = await res.json()
    return data.valid
  }

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
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

  const handleRazorpayCheckout = useCallback(async () => {
    setIsProcessing(true)
    setProcessingGateway("razorpay")

    try {
      const token = await getAccessToken()
      if (!token) {
        toast.error("You must be logged in to make a payment.")
        setIsProcessing(false)
        setProcessingGateway(null)
        return
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay. Please check your connection.")
        setIsProcessing(false)
        setProcessingGateway(null)
        return
      }

      const orderData = await createRazorpayOrder(token)

      const options = {
        key: orderData.key_id,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: "Creo",
        description: description,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const verified = await verifyPaymentOnBackend(
              token,
              response.razorpay_order_id!,
              response.razorpay_payment_id,
              response.razorpay_signature,
            )

            if (verified) {
              toast.success("Payment successful! Welcome to Creo.")
              onPaymentSuccess?.()
              onOpenChange(false)
            } else {
              toast.error("Payment verification failed. Please contact support.")
            }
          } catch (err: any) {
            toast.error(err?.message || "Payment verification failed.")
          } finally {
            setIsProcessing(false)
            setProcessingGateway(null)
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
            setProcessingGateway(null)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: any) {
      toast.error(err?.message || "Payment failed. Please try again.")
      setIsProcessing(false)
      setProcessingGateway(null)
    }
  }, [amount, description, notes, onOpenChange, onPaymentSuccess, user])

  const gatewayLabel = selectedMethod === "razorpay" ? "Razorpay" : "Stripe"
  const buttonLabel = isProcessing
    ? "Processing secure payment..."
    : `Pay ${formatCurrency(amount)} with ${gatewayLabel}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F4FD]">
              <CreditCard className="h-6 w-6 text-[#2B7BC4]" />
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <DialogTitle className="text-center text-lg">
            Complete Payment
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount display */}
          <div className="rounded-lg border border-border bg-bg-internal p-5 text-center">
            <p className="text-3xl font-bold text-[#0D2137]">
              ₹{formatCurrency(amount)}
            </p>
            <p className="text-xs text-gray-500 mt-1">One-time payment</p>
          </div>

          {/* Payment method selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Payment Method</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 ${
                  selectedMethod === "razorpay"
                    ? "border-[#2B7BC4] bg-[#2B7BC4]/5 text-[#2B7BC4]"
                    : "border-gray-200 text-gray-500"
                }`}
                disabled={isProcessing}
                onClick={() => setSelectedMethod("razorpay")}
              >
                Razorpay
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 ${
                  selectedMethod === "stripe"
                    ? "border-[#2B7BC4] bg-[#2B7BC4]/5 text-[#2B7BC4]"
                    : "border-gray-200 text-gray-500"
                }`}
                disabled={isProcessing}
                onClick={() => setSelectedMethod("stripe")}
              >
                Stripe
              </Button>
            </div>
          </div>
        </div>

        {isProcessing && processingGateway && (
          <div className="flex items-center justify-center gap-2 rounded-md bg-blue-50 px-4 py-3 text-sm text-[#2B7BC4]">
            <Loader2 className="size-4 animate-spin" />
            {GATEWAY_LABELS[processingGateway]}
          </div>
        )}

        {!isProcessing && (
          <p className="text-center text-[10px] text-gray-400">
            This is a sandbox environment. No real payment will be charged.
          </p>
        )}

        <DialogFooter>
          <Button
            className="w-full bg-[#2B7BC4] hover:bg-[#2B7BC4]/90 text-white h-11"
            disabled={isProcessing}
            onClick={handleRazorpayCheckout}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {buttonLabel}
              </>
            ) : (
              buttonLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
