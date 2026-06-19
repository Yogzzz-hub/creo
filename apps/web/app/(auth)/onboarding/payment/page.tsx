"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";

export default function PaymentPage() {
  const router = useRouter();
  const supabase = createClient();

  // Payment simulation state (from your HEAD branch)
  const [processing, setProcessing] = useState<"razorpay" | "stripe" | null>(null);

  // Pricing help API state (from Yoga's dev branch)
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);

  function handlePayment(method: "razorpay" | "stripe") {
    setProcessing(method);
    setTimeout(() => {
      setProcessing(null);
      router.push("/onboarding/questionnaire");
    }, 2000);
  }

  async function handlePricingHelp() {
    setHelpLoading(true);
    setHelpError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setHelpError("You must be logged in.");
      setHelpLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/onboarding/pricing-help`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setHelpError(
          data.detail || "Failed to send request. Please try again."
        );
        setHelpLoading(false);
        return;
      }

      setHelpSent(true);
    } catch {
      setHelpError("Failed to connect to server. Please try again.");
    } finally {
      setHelpLoading(false);
    }
  }

  return (
    <CardContent className="py-2">
      {/* Header & Order Summary */}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-brand-dark">Order Summary</h2>
        <p className="mt-1 text-sm text-text-muted">
          Review your selected plan and complete payment.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-bg-internal p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-brand-dark">
              Growth Plan
            </h3>
            <p className="text-sm text-text-muted mt-0.5">
              6 Posters &middot; 4 Reels &middot; 6 Stories / month
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-brand-dark">₹9,999</p>
            <p className="text-xs text-text-muted">/month</p>
          </div>
        </div>
      </div>

      {/* Dev Payment Buttons */}
      <div className="space-y-3 mb-6">
        <Button
          className="w-full bg-brand hover:bg-brand/90 text-white h-11"
          disabled={processing !== null || helpLoading}
          onClick={() => handlePayment("razorpay")}
        >
          {processing === "razorpay" ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 size-4" />
              [DEV] Pay with Razorpay (India)
            </>
          )}
        </Button>

        <Button
          className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white h-11"
          disabled={processing !== null || helpLoading}
          onClick={() => handlePayment("stripe")}
        >
          {processing === "stripe" ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 size-4" />
              [DEV] Pay with Stripe (International)
            </>
          )}
        </Button>
      </div>

      {/* Yoga's Interactive Sales Request */}
      <div className="text-center">
        {helpSent ? (
          <div className="inline-flex items-center gap-2 rounded-md bg-success-light px-4 py-2 text-sm text-success text-left max-w-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Our sales team has been notified and will reach out via WhatsApp shortly.</span>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="ghost"
              onClick={handlePricingHelp}
              disabled={helpLoading || processing !== null}
              className="text-sm text-brand hover:text-brand/80 hover:bg-brand-light font-normal h-auto py-1"
            >
              {helpLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Notifying...
                </>
              ) : (
                "Not satisfied with pricing? Contact our sales team."
              )}
            </Button>

            {helpError && (
              <p className="text-sm text-error">{helpError}</p>
            )}
          </div>
        )}
      </div>
    </CardContent>
  );
}