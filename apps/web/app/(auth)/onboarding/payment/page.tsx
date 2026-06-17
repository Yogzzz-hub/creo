"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";

export default function PaymentPage() {
  const router = useRouter();
  const [processing, setProcessing] = useState<"razorpay" | "stripe" | null>(null);

  function handlePayment(method: "razorpay" | "stripe") {
    setProcessing(method);
    setTimeout(() => {
      setProcessing(null);
      router.push("/onboarding/questionnaire");
    }, 2000);
  }

  return (
    <CardContent className="py-2">
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

      <div className="space-y-3 mb-6">
        <Button
          className="w-full bg-brand hover:bg-brand/90 text-white h-11"
          disabled={processing !== null}
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
          disabled={processing !== null}
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

      <div className="text-center">
        <p className="text-sm text-text-muted">
          Not satisfied with pricing?{" "}
          <a
            href="mailto:sales@creo.in"
            className="inline-flex items-center gap-1 text-brand hover:underline"
          >
            Contact our sales team
            <ExternalLink className="size-3" />
          </a>
        </p>
      </div>
    </CardContent>
  );
}
