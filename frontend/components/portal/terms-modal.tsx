"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
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
import { ShieldCheck, Loader2, X } from "lucide-react"
import { toast } from "sonner"

interface TermsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccept?: () => void
}

export function TermsModal({ open, onOpenChange, onAccept }: TermsModalProps) {
  const router = useRouter()
  const { user } = useSession()
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [checked, setChecked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    if (scrollHeight - scrollTop - clientHeight < 10) {
      setHasScrolledToBottom(true)
    }
  }, [])
  const handleAccept = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (!user) throw new Error("Not authenticated")

      // 1. Persist terms acceptance directly to the database via backend API
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (token) {
        const { getApiUrl } = await import("@/lib/api-url")
        const res = await fetch(`${getApiUrl()}/api/v1/onboarding/accept-terms`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          console.warn("Backend accept-terms response:", body)
        }
      }

      // 2. Synchronize Supabase users record
      try {
        await supabase
          .from("users")
          .update({ terms_accepted: true })
          .eq("auth_id", user.id)
      } catch (sbErr) {
        console.warn("Direct Supabase update skipped:", sbErr)
      }

      toast.success("Terms accepted successfully!")
      onAccept?.()
    } catch (err: any) {
      const msg = err?.message || err?.details || "Failed to accept terms. Please try again."
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F4FD]">
              <ShieldCheck className="h-6 w-6 text-[#2B7BC4]" />
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
            Terms &amp; Conditions
          </DialogTitle>
          <DialogDescription className="text-center">
            Please review and accept our terms to continue.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[320px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700"
        >
          <div className="space-y-5">
            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                1. Acceptance of Terms
              </h3>
              <p>
                By accessing and using the Creo platform (&quot;Service&quot;), you
                agree to be bound by these Terms and Conditions (&quot;Terms&quot;).
                If you do not agree to all of these Terms, you may not access or
                use the Service.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                2. Service Description
              </h3>
              <p>
                Creo provides a managed digital marketing service that includes
                content creation, social media management, content calendar
                planning, and brand strategy. Deliverables, posting cadence, and
                support level vary based on the subscription plan you select.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                3. Account Registration
              </h3>
              <p>
                You must create an account and provide accurate, current, and
                complete information. You are responsible for safeguarding your
                account credentials and for all activities under your account.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                4. Subscription Plans &amp; Payment
              </h3>
              <p>
                Creo offers tiered subscription plans billed monthly and
                automatically renewed unless cancelled. Payments are processed
                via Razorpay (India) or Stripe (International). We do not store
                your payment card details.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                5. Content Creation &amp; Ownership
              </h3>
              <p>
                All content created for your brand becomes your property upon
                approval and payment. Creo retains the right to showcase
                approved content in its portfolio unless you request otherwise
                in writing.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                6. Content Approval &amp; Revisions
              </h3>
              <p>
                Each plan includes a specific number of revision rounds.
                Revisions must be requested within 48 hours of delivery.
                Additional rounds may be purchased as add-ons.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                7. Cancellation &amp; Refunds
              </h3>
              <p>
                You may cancel at any time. Cancellations take effect at the end
                of the current billing cycle. No prorated refunds for partial
                months. Full refund available before first content delivery.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                8. Intellectual Property
              </h3>
              <p>
                All content, design, code, and materials on the Creo platform
                are protected by copyright, trademark, and other intellectual
                property laws.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                9. Limitation of Liability
              </h3>
              <p>
                Creo shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages. Total liability shall not
                exceed the amount paid in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                10. Privacy &amp; Data Protection
              </h3>
              <p>
                Your use of the Service is governed by our Privacy Policy. We
                comply with applicable data protection laws including the DPDP
                Act, 2023 for Indian users.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                11. Termination
              </h3>
              <p>
                Creo reserves the right to suspend or terminate your access at
                any time, with or without cause. Upon termination, your right to
                use the Service immediately ceases.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                12. Changes to Terms
              </h3>
              <p>
                Creo reserves the right to modify these Terms at any time.
                Material changes will be posted on this page. Continued use
                constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-[#0D2137]">
                13. Contact Information
              </h3>
              <p>
                Questions about these Terms? Contact us at:
              </p>
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-gray-600">
                <li>Email: legal@creo.in</li>
                <li>Phone: +91-XXXXXXXXXX</li>
                <li>Address: Creo Digital Marketing Agency, India</li>
              </ul>
            </section>

            <p className="border-t border-gray-200 pt-3 text-xs text-gray-400">
              Last Updated: June 2026
            </p>
          </div>
        </div>

        <label className={`flex items-start gap-3 select-none ${hasScrolledToBottom ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
          <input
            type="checkbox"
            checked={checked}
            disabled={!hasScrolledToBottom}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-gray-300 accent-[#2B7BC4] disabled:opacity-50"
          />
          <span className="text-sm text-gray-700">
            {hasScrolledToBottom 
              ? "I have read and agree to the Terms and Conditions"
              : "Please scroll to the bottom to accept the terms"}
          </span>
        </label>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            className="w-full bg-[#2B7BC4] hover:bg-[#2B7BC4]/90 text-white h-11"
            disabled={!checked || isSubmitting}
            onClick={handleAccept}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Accepting...
              </>
            ) : (
              "Accept & Continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
