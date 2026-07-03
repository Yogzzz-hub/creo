"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
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
}

const PLANS: Record<PlanSlug, { label: string; price: string; amount: number; features: string[] }> = {
  starter: {
    label: "Starter",
    price: "₹4,999",
    amount: 4999,
    features: ["5 social accounts", "20 posts/mo", "Basic analytics"],
  },
  growth: {
    label: "Growth",
    price: "₹9,999",
    amount: 9999,
    features: ["15 social accounts", "40 posts/mo", "Advanced analytics", "Dedicated manager"],
  },
  pro: {
    label: "Pro",
    price: "₹14,999",
    amount: 14999,
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

export function PaymentModal({ open, onOpenChange, onPaymentSuccess }: PaymentModalProps) {
  const supabase = createClient()

  const [selectedPlan, setSelectedPlan] = useState<PlanSlug>("starter")
  const [selectedMethod, setSelectedMethod] = useState<Gateway>("razorpay")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingGateway, setProcessingGateway] = useState<Gateway | null>(null)

  const plan = PLANS[selectedPlan]

  const handleMockPayment = async () => {
    setIsProcessing(true)
    setProcessingGateway(selectedMethod)

    await new Promise((resolve) => setTimeout(resolve, 2500))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error: updateError } = await supabase
        .from("users")
        .update({
          account_status: "active",
          onboarding_stage: 3,
          plan_name: selectedPlan,
        })
        .eq("auth_id", user.id)

      if (updateError) {
        console.error("[payment-modal] DB update failed:", updateError.message, updateError)
        throw updateError
      }

      toast.success(`${plan.label} plan purchased via ${selectedMethod === "razorpay" ? "Razorpay" : "Stripe"}! Welcome to Creo.`)
      onPaymentSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const msg = err?.message || err?.details || "Payment failed. Please try again."
      toast.error(msg)
    } finally {
      setIsProcessing(false)
      setProcessingGateway(null)
    }
  }

  const gatewayLabel = selectedMethod === "razorpay" ? "Razorpay" : "Stripe"
  const buttonLabel = isProcessing
    ? "Processing secure payment..."
    : `Pay ${plan.price} with ${gatewayLabel}`

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
            Choose your plan and enter payment details to activate your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Select Plan</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(PLANS) as PlanSlug[]).map((slug) => {
                const p = PLANS[slug]
                const active = selectedPlan === slug
                return (
                  <button
                    key={slug}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setSelectedPlan(slug)}
                    className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                      active
                        ? "border-[#2B7BC4] bg-[#2B7BC4]/5"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {active && (
                      <div className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-[#2B7BC4]">
                        <Check className="size-3 text-white" />
                      </div>
                    )}
                    <p className="text-sm font-semibold text-[#0D2137]">{p.label}</p>
                    <p className="mt-1 text-lg font-bold text-[#0D2137]">
                      {p.price}<span className="text-xs font-normal text-gray-500">/mo</span>
                    </p>
                    <ul className="mt-2 space-y-1">
                      {p.features.map((f) => (
                        <li key={f} className="text-[11px] text-gray-500">{f}</li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-gray-200" />

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
            onClick={handleMockPayment}
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
