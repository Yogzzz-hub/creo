"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// ── Razorpay types ──────────────────────────────────────────────
interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => void;
  prefill: { email?: string; contact?: string };
  theme: { color: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayResponse {
  razorpay_subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

// ── Stripe imports (lazy) ───────────────────────────────────────
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

// ── Helpers ─────────────────────────────────────────────────────
function getAccessToken(): Promise<string | null> {
  return createClient()
    .auth.getSession()
    .then(({ data: { session } }) => session?.access_token ?? null);
}

async function apiCreateSubscription(
  token: string,
  planId: string,
  country: string
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/create-subscription`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan_id: planId, billing_country: country }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Failed to create subscription");
  }
  return res.json() as Promise<{
    gateway: string;
    subscription_id: string;
    client_secret: string | null;
    gateway_customer_id: string;
  }>;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Stripe inner form (must be inside <Elements>) ──────────────
function StripePaymentForm({
  clientSecret,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;

      setSubmitting(true);
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/onboarding/questionnaire`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "Payment failed. Please try again.");
        setSubmitting(false);
      } else {
        onSuccess();
      }
    },
    [stripe, elements, onSuccess, onError]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white h-11"
        disabled={!stripe || !elements || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 size-4" />
            Pay with Stripe
          </>
        )}
      </Button>
    </form>
  );
}

// ── Main page ───────────────────────────────────────────────────
export default function PaymentPage() {
  const router = useRouter();

  const [processing, setProcessing] = useState<"razorpay" | "stripe" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Pricing help state
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);

  // Stripe state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null
  );

  // ── Razorpay handler ──────────────────────────────────────────
  const handleRazorpay = useCallback(async () => {
    setError(null);
    setProcessing("razorpay");

    try {
      const token = await getAccessToken();
      if (!token) {
        setError("You must be logged in.");
        setProcessing(null);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Failed to load Razorpay. Please check your connection.");
        setProcessing(null);
        return;
      }

      const data = await apiCreateSubscription(token, "growth", "IN");

      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        subscription_id: data.subscription_id,
        name: "Creo",
        description: "Growth Plan Subscription",
        handler: () => {
          setProcessing(null);
          router.push("/onboarding/questionnaire");
        },
        prefill: {},
        theme: { color: "#2B7BC4" },
        modal: {
          ondismiss: () => setProcessing(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment failed. Please try again."
      );
      setProcessing(null);
    }
  }, [router]);

  // ── Stripe handler ────────────────────────────────────────────
  const handleStripe = useCallback(async () => {
    setError(null);
    setProcessing("stripe");

    try {
      const token = await getAccessToken();
      if (!token) {
        setError("You must be logged in.");
        setProcessing(null);
        return;
      }

      const data = await apiCreateSubscription(token, "growth", "US");

      if (!data.client_secret) {
        setError("Failed to initialize Stripe payment.");
        setProcessing(null);
        return;
      }

      setStripeClientSecret(data.client_secret);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment failed. Please try again."
      );
      setProcessing(null);
    }
  }, []);

  const handleStripeSuccess = useCallback(() => {
    setStripeClientSecret(null);
    setProcessing(null);
    router.push("/onboarding/questionnaire");
  }, [router]);

  const handleStripeError = useCallback((msg: string) => {
    setError(msg);
    setProcessing(null);
  }, []);

  // ── Pricing help ──────────────────────────────────────────────
  async function handlePricingHelp() {
    setHelpLoading(true);
    setHelpError(null);

    const token = await getAccessToken();
    if (!token) {
      setHelpError("You must be logged in.");
      setHelpLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/onboarding/pricing-help`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setHelpError(data.detail || "Failed to send request. Please try again.");
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

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stripe Elements (shown after API call) */}
      {stripeClientSecret ? (
        <div className="mb-6">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: stripeClientSecret,
              appearance: { theme: "stripe", variables: { colorPrimary: "#2B7BC4" } },
            }}
          >
            <StripePaymentForm
              clientSecret={stripeClientSecret}
              onSuccess={handleStripeSuccess}
              onError={handleStripeError}
            />
          </Elements>
          <button
            onClick={() => {
              setStripeClientSecret(null);
              setProcessing(null);
              setError(null);
            }}
            className="mt-3 w-full text-center text-sm text-text-muted hover:underline"
          >
            Use a different payment method
          </button>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          <Button
            className="w-full bg-brand hover:bg-brand/90 text-white h-11"
            disabled={processing !== null || helpLoading}
            onClick={handleRazorpay}
          >
            {processing === "razorpay" ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 size-4" />
                Pay with Razorpay (India)
              </>
            )}
          </Button>

          <Button
            className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white h-11"
            disabled={processing !== null || helpLoading}
            onClick={handleStripe}
          >
            {processing === "stripe" ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 size-4" />
                Pay with Stripe (International)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Pricing help */}
      <div className="text-center">
        {helpSent ? (
          <div className="inline-flex items-center gap-2 rounded-md bg-success-light px-4 py-2 text-sm text-success text-left max-w-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Our sales team has been notified and will reach out via WhatsApp
              shortly.
            </span>
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

            {helpError && <p className="text-sm text-error">{helpError}</p>}
          </div>
        )}
      </div>
    </CardContent>
  );
}
