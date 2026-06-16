"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

export default function TermsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 20) {
      setScrolledToBottom(true);
    }
  }

  async function handleAccept() {
    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("You must be logged in to accept terms.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/onboarding/accept-terms`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Failed to accept terms. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/onboarding/payment");
    } catch {
      setError("Failed to connect to server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
            <ShieldCheck className="h-6 w-6 text-brand" />
          </div>
          <CardTitle className="text-2xl font-bold text-brand-dark">
            Terms &amp; Conditions
          </CardTitle>
          <CardDescription>
            Please read and accept our terms to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onScroll={handleScroll}
            className="h-72 overflow-y-auto rounded-md border border-border bg-surface p-5 text-sm leading-relaxed text-text"
          >
            <h3 className="mb-3 text-base font-semibold text-brand-dark">
              Creo Digital Marketing Services — Terms of Service
            </h3>

            <p className="mb-3">
              Welcome to Creo. By accessing or using our digital marketing
              platform and services, you agree to be bound by these Terms and
              Conditions. Please read them carefully before proceeding.
            </p>

            <h4 className="mb-2 font-semibold text-brand-dark">
              1. Services
            </h4>
            <p className="mb-3">
              Creo provides digital marketing services including but not limited
              to social media management, content creation, content calendar
              planning, performance reporting, and Instagram publishing. The
              specific deliverables and quotas are determined by your selected
              subscription plan.
            </p>

            <h4 className="mb-2 font-semibold text-brand-dark">
              2. Subscription &amp; Payment
            </h4>
            <p className="mb-3">
              Your subscription begins upon successful payment and continues on a
              monthly basis. Payments are processed through our secure payment
              partners (Razorpay for India, Stripe for international). You may
              upgrade or downgrade your plan at any time, with proration applied
              to the current billing cycle.
            </p>

            <h4 className="mb-2 font-semibold text-brand-dark">
              3. Content &amp; Deliverables
            </h4>
            <p className="mb-3">
              All content created by Creo is delivered for your review before
              publishing. You retain the right to approve, reject, or request
              revisions on any deliverable, subject to the revision rounds
              included in your plan. Approved content may be published to your
              connected Instagram account upon your explicit consent.
            </p>

            <h4 className="mb-2 font-semibold text-brand-dark">
              4. Client Responsibilities
            </h4>
            <p className="mb-3">
              You are responsible for providing accurate business information,
              timely feedback on deliverables, and maintaining access to your
              social media accounts. Delays in feedback may affect the delivery
              schedule of your content calendar.
            </p>

            <h4 className="mb-2 font-semibold text-brand-dark">
              5. Data &amp; Privacy
            </h4>
            <p className="mb-3">
              We take your privacy seriously. Your business data, social media
              credentials, and personal information are stored securely and never
              shared with third parties without your explicit consent. Instagram
              access tokens are encrypted at rest.
            </p>

            <h4 className="mb-2 font-semibold text-brand-dark">
              6. Cancellation &amp; Refunds
            </h4>
            <p className="mb-3">
              You may cancel your subscription at any time. Cancellation takes
              effect at the end of the current billing period. Refund requests
              are handled on a case-by-case basis by our support team.
            </p>

            <h4 className="mb-2 font-semibold text-brand-dark">
              7. Limitation of Liability
            </h4>
            <p className="mb-3">
              Creo shall not be liable for any indirect, incidental, or
              consequential damages arising from the use of our services. Our
              total liability shall not exceed the amount paid by you for the
              services during the twelve months preceding the claim.
            </p>

            <h4 className="mb-2 font-semibold text-brand-dark">
              8. Amendments
            </h4>
            <p className="mb-3">
              We reserve the right to modify these terms at any time. You will be
              notified of significant changes via email or through the platform.
              Continued use of our services after such changes constitutes
              acceptance of the updated terms.
            </p>

            <p className="mt-4 text-xs text-text-muted">
              Last updated: June 2026
            </p>
          </div>

          {!scrolledToBottom && (
            <p className="mt-2 text-xs text-text-muted text-center">
              Please scroll to the bottom to continue
            </p>
          )}

          {error && (
            <div className="mt-3 text-sm text-error bg-error-light p-3 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleAccept}
            disabled={!scrolledToBottom || loading}
            className="w-full bg-brand hover:bg-brand/90 text-white h-11 text-base font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              "I Agree — Continue to Payment"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
