"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getBaseUrl } from "@/lib/utils";
import { getApiUrl } from "@/lib/api-url";

// ── Razorpay types ──────────────────────────────────────────────
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => void | Promise<void>;
  prefill: { email?: string; contact?: string };
  theme: { color: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayResponse {
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
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

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

// ── Helpers ─────────────────────────────────────────────────────
type PlanName = "starter" | "growth" | "pro";

interface PlanDetails {
  name: PlanName;
  display_name: string;
  monthly_price: number;
  poster_quota: number;
  reel_quota: number;
  story_quota: number;
  revision_rounds: number;
  has_dedicated_manager: boolean;
}

function getAccessToken(): Promise<string | null> {
  return createClient()
    .auth.getSession()
    .then(({ data }: {
      data: { session: { access_token?: string } | null };
    }) => data.session?.access_token ?? null);
}

async function apiCreateOrder(
  token: string,
  amount: number,
  planName: PlanName
) {
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
        notes: { plan_name: planName, description: `${planName} Plan Subscription` },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Failed to create payment order");
  }
  return res.json() as Promise<{
    order_id: string;
    amount: number;
    currency: string;
    receipt: string;
    key_id: string;
  }>;
}

async function apiVerifyPayment(
  token: string,
  response: RazorpayResponse,
  planName: PlanName,
  timeoutMs = 30000
): Promise<{ valid: boolean; account_status: string; onboarding_stage: number }> {
  if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
    throw new Error("Razorpay returned incomplete payment details. Please try again.");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `${getApiUrl()}/api/v1/payments/verify-payment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: response.razorpay_order_id,
          payment_id: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          plan_name: planName,
        }),
        signal: controller.signal,
      }
    );

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.detail || "Payment verification failed. Please try again.");
    }
    if (!body.valid) {
      throw new Error("Payment verification was rejected. Please contact support before trying again.");
    }
    return body;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Payment verification timed out. Check your payment status or try again.");
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
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
  onSuccess,
  onError,
}: {
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
          return_url: `${getBaseUrl()}/onboarding/questionnaire`,
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
function PaymentContent() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);

  const [processing, setProcessing] = useState<"razorpay" | "stripe" | null>(
    null
  );
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pricing help state
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);

  // Stripe state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null
  );
  const stripeAvailable = Boolean(STRIPE_PUBLISHABLE_KEY);

  // Plan details from API
  const [plans, setPlans] = useState<PlanDetails[]>([]);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch(
          `${getApiUrl()}/api/v1/plans`
        );
        if (!res.ok) return;
        const availablePlans: PlanDetails[] = await res.json();
        setPlans(availablePlans.filter((plan) =>
          ["starter", "growth", "pro"].includes(plan.name)
        ));
      } catch {
        setPlans([]);
      }
    }
    fetchPlans();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function redirectIfAlreadyActive() {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;

        const res = await fetch(`${getApiUrl()}/api/v1/auth/me/role`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;

        const data: { account_status?: string } = await res.json();
        if (data.account_status === "active") {
          router.push("/onboarding/questionnaire");
        }
      } catch {
        // Keep the payment screen available if the status check cannot connect.
      }
    }

    redirectIfAlreadyActive();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const planDetails = plans.find((plan) => plan.name === selectedPlan) ?? null;

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

      if (!selectedPlan || !planDetails) {
        setError("Please select a plan before starting payment.");
        setProcessing(null);
        return;
      }

      const data = await apiCreateOrder(
        token,
        planDetails.monthly_price,
        selectedPlan
      );

      const options: RazorpayOptions = {
        key: data.key_id,
        amount: data.amount * 100,
        currency: data.currency,
        order_id: data.order_id,
        name: "Creo",
        description: `${planDetails.display_name} Plan Subscription`,
        handler: async (response) => {
          try {
            setVerifyingPayment(true);
            const verification = await apiVerifyPayment(token, response, selectedPlan);
            setProcessing(null);
            setVerifyingPayment(false);
            if (verification.account_status === "active") {
              setPaymentSuccess(true);
              router.push("/onboarding/questionnaire");
            } else {
              setIsWaitingForWebhook(true);
            }
          } catch (err) {
            setProcessing(null);
            setVerifyingPayment(false);
            setIsWaitingForWebhook(false);
            setError(
              err instanceof Error
                ? `${err.message} If money was deducted, contact support with your Razorpay payment ID.`
                : "Payment verification failed. Please try again or contact support if money was deducted."
            );
          }
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
  }, [planDetails, selectedPlan]);

  // ── Stripe handler ────────────────────────────────────────────
  const handleStripeSuccess = useCallback(() => {
    setStripeClientSecret(null);
    setProcessing(null);
    setIsWaitingForWebhook(true);
  }, []);

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
        `${getApiUrl()}/api/v1/onboarding/pricing-help`,
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

  const { data: roleData } = useQuery({
    queryKey: ["payment-auth-role-polling"],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("No token");
      const res = await fetch(`${getApiUrl()}/api/v1/auth/me/role`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch role");
      return res.json();
    },
    enabled: isWaitingForWebhook,
    refetchInterval: (query) => {
      if (query.state.data && query.state.data.account_status === "active") {
        return false; // stop polling
      }
      return 2000;
    }
  });

  useEffect(() => {
    if (!isWaitingForWebhook) return;

    const timeoutId = window.setTimeout(() => {
      setIsWaitingForWebhook(false);
      setError("Payment was verified, but account activation is taking longer than expected. Please refresh or contact support.");
    }, 60000);

    return () => window.clearTimeout(timeoutId);
  }, [isWaitingForWebhook]);

  useEffect(() => {
    if (roleData?.account_status === "active" && isWaitingForWebhook) {
      router.push("/onboarding/questionnaire");
    }
  }, [roleData, isWaitingForWebhook, router]);

  if (verifyingPayment) {
    return (
      <CardContent className="py-12 flex flex-col items-center justify-center text-center">
        <Loader2 className="size-10 animate-spin text-brand mb-4" />
        <h2 className="text-xl font-bold text-brand-dark mb-2">Verifying Payment...</h2>
        <p className="text-sm text-text-muted max-w-sm">
          Please do not refresh or close this page while we confirm your transaction securely.
        </p>
      </CardContent>
    );
  }

  if (isWaitingForWebhook) {
    return (
      <CardContent className="py-12 flex flex-col items-center justify-center text-center">
        <Loader2 className="size-10 animate-spin text-brand mb-4" />
        <h2 className="text-xl font-bold text-brand-dark mb-2">Processing Payment...</h2>
        <p className="text-sm text-text-muted max-w-sm">
          Please wait while we confirm your payment securely with the bank. Do not close this window.
        </p>
      </CardContent>
    );
  }

  if (paymentSuccess) {
    return (
      <CardContent className="py-12 flex flex-col items-center justify-center text-center">
        <CheckCircle2 className="size-10 text-success mb-4" />
        <h2 className="text-xl font-bold text-brand-dark mb-2">Payment Successful!</h2>
        <p className="text-sm text-text-muted max-w-sm">
          Redirecting you to your brand profile...
        </p>
        <Loader2 className="size-5 animate-spin text-brand mt-4" />
      </CardContent>
    );
  }

  return (
    <CardContent className="py-2">
      {/* Header & Order Summary */}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-brand-dark">Order Summary</h2>
        <p className="mt-1 text-sm text-text-muted">
          Choose a plan, then complete payment.
        </p>
      </div>

      <fieldset className="mb-6">
        <legend className="mb-3 text-sm font-semibold text-brand-dark">Choose your plan</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["starter", "growth", "pro"] as PlanName[]).map((planName) => {
            const plan = plans.find((item) => item.name === planName);
            const isSelected = selectedPlan === planName;

            return (
              <label
                key={planName}
                className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                  isSelected
                    ? "border-brand bg-brand-light ring-2 ring-brand/20"
                    : "border-border hover:border-brand/50"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={planName}
                  checked={isSelected}
                  onChange={() => {
                    setSelectedPlan(planName);
                    setError(null);
                  }}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-brand-dark">
                  {plan?.display_name ?? `${planName[0].toUpperCase()}${planName.slice(1)}`}
                </span>
                <span className="mt-1 block text-xs text-text-muted">
                  {plan ? `Rs. ${plan.monthly_price.toLocaleString("en-IN")} / month` : "Loading..."}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-lg border border-border bg-bg-internal p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-brand-dark">
              {planDetails?.display_name ?? "Select a plan"}
            </h3>
            <p className="text-sm text-text-muted mt-0.5">
              {planDetails
                ? `${planDetails.poster_quota} Posters / ${planDetails.reel_quota} Reels / ${planDetails.story_quota} Stories / month / ${planDetails.revision_rounds} revision round${planDetails.revision_rounds === 1 ? "" : "s"}${planDetails.has_dedicated_manager ? " / Dedicated manager" : ""}`
                : plans.length === 0 ? "Loading plan details..." : "Choose Starter, Growth, or Pro to see plan details."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-brand-dark">
              {planDetails ? `Rs. ${planDetails.monthly_price.toLocaleString("en-IN")}` : "-"}
            </p>
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
      {stripeClientSecret && stripeAvailable ? (
        <div className="mb-6">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: stripeClientSecret,
              appearance: { theme: "stripe", variables: { colorPrimary: "#2B7BC4" } },
            }}
          >
            <StripePaymentForm
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
            disabled={processing !== null || helpLoading || !planDetails}
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

          <div>
            <Button
              className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white h-11"
              disabled
            >
              <CreditCard className="mr-2 size-4" />
              Stripe checkout unavailable
            </Button>
            <p className="mt-2 text-center text-xs text-gray-400">
              Please use Razorpay until the Stripe order endpoint is configured.
            </p>
          </div>
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

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
