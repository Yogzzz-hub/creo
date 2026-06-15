"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";

export default function PaymentPage() {
  const supabase = createClient();

  const [helpLoading, setHelpLoading] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);

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
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
            <CreditCard className="h-6 w-6 text-brand" />
          </div>
          <CardTitle className="text-2xl font-bold text-brand-dark">
            Complete Your Payment
          </CardTitle>
          <CardDescription>
            Choose your plan and start growing your brand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="text-text-muted text-sm">
              Payment integration will be available soon. Razorpay (India) and
              Stripe (International) modals will be rendered here.
            </p>
          </div>

          <div className="text-center">
            {helpSent ? (
              <div className="inline-flex items-center gap-2 rounded-md bg-success-light px-4 py-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Our sales team has been notified and will reach out via WhatsApp
                shortly.
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  onClick={handlePricingHelp}
                  disabled={helpLoading}
                  className="text-sm text-brand hover:text-brand/80 hover:bg-brand-light"
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
      </Card>
    </div>
  );
}
