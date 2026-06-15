"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";

export default function TermsPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, clientHeight, scrollHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setAgreed(true);
    }
  }, []);

  const handleAgree = useCallback(() => {
    setIsSubmitting(true);

    // TODO: Wire to API — POST /api/v1/onboarding/accept-terms
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/onboarding/payment");
    }, 800);
  }, [router]);

  return (
    <CardContent className="py-2">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold text-brand-dark">
          Terms & Conditions
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Please review and accept our terms to continue.
        </p>
      </div>

      <div className="flex justify-end mb-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-brand hover:bg-brand/5"
        >
          <Download className="mr-1.5 size-3.5" />
          Download PDF
        </Button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-[400px] overflow-y-auto rounded-lg border border-border bg-bg-internal p-5 text-sm text-text leading-relaxed"
      >
        <div className="space-y-6">
          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              1. Acceptance of Terms
            </h3>
            <p>
              By accessing and using the Creo platform (&quot;Service&quot;), you
              agree to be bound by these Terms and Conditions (&quot;Terms&quot;).
              If you do not agree to all of these Terms, you may not access or
              use the Service. These Terms constitute a legally binding agreement
              between you (&quot;Client&quot;, &quot;you&quot;, or &quot;your&quot;)
              and Creo Digital Marketing Agency (&quot;Creo&quot;, &quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;).
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              2. Service Description
            </h3>
            <p>
              Creo provides a managed digital marketing service that includes
              content creation, social media management, content calendar
              planning, and brand strategy. The specific deliverables, posting
              cadence, and support level vary based on the subscription plan
              you select. We deliver content weekly and provide a client portal
              for reviewing, approving, and managing all deliverables.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              3. Account Registration
            </h3>
            <p>
              To use the Service, you must create an account and provide
              accurate, current, and complete information during the registration
              process. You are responsible for safeguarding your account
              credentials and for all activities that occur under your account.
              You agree to notify Creo immediately of any unauthorized use of
              your account. Creo reserves the right to suspend or terminate
              accounts that are found to contain inaccurate or misleading
              information.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              4. Subscription Plans &amp; Payment
            </h3>
            <p>
              Creo offers tiered subscription plans (Starter, Growth, and Pro)
              with different content allowances and support levels. All pricing
              is displayed in Indian Rupees (INR) unless otherwise noted.
              Subscriptions are billed on a monthly basis and are automatically
              renewed unless cancelled before the billing cycle ends. We accept
              payments through Razorpay (for Indian clients) and Stripe (for
              international clients). All payments are processed securely and we
              do not store your payment card details on our servers.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              5. Content Creation &amp; Ownership
            </h3>
            <p>
              All content created by Creo for your brand, including but not
              limited to graphics, videos, reels, stories, captions, and text
              content, becomes your property upon approval and payment. Creo
              retains the right to showcase approved content in its portfolio
              and marketing materials unless you explicitly request otherwise in
              writing. You grant Creo a limited, non-exclusive license to use
              your brand assets (logos, images, product photos) solely for the
              purpose of creating content for your account.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              6. Content Approval &amp; Revisions
            </h3>
            <p>
              Each subscription plan includes a specific number of revision
              rounds per deliverable. Revisions must be requested through the
              client portal within 48 hours of content delivery. If revisions
              are not requested within this window, the content is considered
              approved. Additional revision rounds beyond your plan allowance
              may be purchased as add-ons. Creo will make reasonable efforts to
              accommodate all revision requests, but reserves the right to
              decline requests that fall outside the scope of the original brief
              or brand guidelines.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              7. Cancellation &amp; Refunds
            </h3>
            <p>
              You may cancel your subscription at any time through your account
              settings or by contacting our support team. Cancellations take
              effect at the end of the current billing cycle. We do not offer
              prorated refunds for partial months. If you cancel during an
              onboarding period before the first content delivery, a full
              refund will be issued within 5-7 business days. After the first
              content delivery, no refunds will be provided for the current
              billing period.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              8. Intellectual Property
            </h3>
            <p>
              All content, design, code, and materials on the Creo platform are
              the intellectual property of Creo or its licensors and are
              protected by copyright, trademark, and other intellectual property
              laws. You may not reproduce, distribute, modify, create derivative
              works of, publicly display, or in any way exploit any of the
              Service content without prior written consent from Creo.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              9. Limitation of Liability
            </h3>
            <p>
              To the maximum extent permitted by law, Creo shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages, or any loss of profits or revenue, whether incurred
              directly or indirectly, or any loss of data, use, goodwill, or
              other intangible losses resulting from your use of the Service.
              Creo&apos;s total liability for any claims arising from these
              Terms or the Service shall not exceed the amount you paid to Creo
              in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              10. Privacy &amp; Data Protection
            </h3>
            <p>
              Your use of the Service is also governed by our Privacy Policy,
              which describes how we collect, use, and protect your personal
              information. By using the Service, you consent to the collection
              and use of information as outlined in our Privacy Policy. We comply
              with applicable data protection laws, including the Information
              Technology Act, 2000 and the Digital Personal Data Protection Act,
              2023 (DPDP Act) for Indian users.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              11. Termination
            </h3>
            <p>
              Creo reserves the right to suspend or terminate your access to the
              Service at any time, with or without cause, and with or without
              notice. Upon termination, your right to use the Service will
              immediately cease. Creo shall not be liable to you or any third
              party for any termination of your access to the Service. All
              provisions of these Terms which by their nature should survive
              termination shall survive, including ownership provisions,
              warranty disclaimers, and limitations of liability.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              12. Changes to Terms
            </h3>
            <p>
              Creo reserves the right to modify these Terms at any time. We will
              notify you of any material changes by posting the new Terms on
              this page and updating the &quot;Last Updated&quot; date at the top.
              Your continued use of the Service after any such changes
              constitutes your acceptance of the new Terms. It is your
              responsibility to review these Terms periodically for changes.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-brand-dark mb-2">
              13. Contact Information
            </h3>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Email: legal@creo.in</li>
              <li>Phone: +91-XXXXXXXXXX</li>
              <li>Address: Creo Digital Marketing Agency, India</li>
            </ul>
          </section>

          <p className="text-xs text-text-muted pt-4 border-t border-border">
            Last Updated: June 2026
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <Button
          className="w-full bg-brand hover:bg-brand/90 text-white h-11"
          disabled={!agreed || isSubmitting}
          onClick={handleAgree}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Processing...
            </>
          ) : (
            "I Agree & Continue"
          )}
        </Button>

        {!agreed && (
          <p className="text-xs text-text-muted text-center">
            Please scroll to the bottom of the terms to continue.
          </p>
        )}
      </div>
    </CardContent>
  );
}
