"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CreditCard, Loader2, X } from "lucide-react"
import { toast } from "sonner"

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleProceed = async () => {
    setIsSubmitting(true)
    try {
      // ── PAYMENT GATEWAY BYPASSED ────────────────────────────
      // Placeholder: route directly to questionnaire.
      // Restore real payment flow once gateway is connected.
      router.push("/onboarding/questionnaire")
    } catch (err) {
      console.error("[payment-modal] failed:", err)
      const msg = err instanceof Error ? err.message : "Payment step failed. Please try again."
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

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

        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#0D2137]">Starter Plan</p>
              <p className="text-xs text-gray-500">Monthly subscription</p>
            </div>
            <p className="text-lg font-bold text-[#0D2137]">₹4,999/mo</p>
          </div>
          <div className="h-px bg-gray-200" />
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Payment Method</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-[#2B7BC4] text-[#2B7BC4]"
                disabled
              >
                Razorpay
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-gray-300 text-gray-500"
                disabled
              >
                Stripe
              </Button>
            </div>
            <p className="text-[10px] text-gray-400">
              Payment gateway integration coming soon. Click below to continue.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full bg-[#2B7BC4] hover:bg-[#2B7BC4]/90 text-white h-11"
            disabled={isSubmitting}
            onClick={handleProceed}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Continue to Questionnaire"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
