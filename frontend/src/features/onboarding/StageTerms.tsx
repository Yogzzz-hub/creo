import { motion } from "motion/react";
/**
 * Stage 2 — MSA (Master Service Agreement) acceptance.
 *
 * The Accept button is DISABLED until the user has scrolled to the bottom
 * of the agreement text. An IntersectionObserver on a sentinel element
 * (not a timer) detects this.
 */
import { useCallback, useRef, useState } from "react";

interface StageTermsProps {
  userId: string;
  onAccepted: () => void;
  isSubmitting: boolean;
}

const MSA_TEXT = `MASTER SERVICE AGREEMENT — CREO DIGITAL AGENCY

Last updated: January 2025

This Master Service Agreement ("Agreement") is entered into between Creo Digital
Agency Pvt. Ltd. ("Agency") and the Client identified during registration.

1. SCOPE OF SERVICES
   Agency will provide digital marketing services as described in the selected
   subscription plan, including but not limited to social media content creation,
   brand identity development, and creative campaign management.

2. PAYMENT TERMS
   Client agrees to pay the subscription fee as selected during onboarding.
   Payments are due on the first day of each billing cycle. A grace period of
   7 days applies before service suspension.

3. INTELLECTUAL PROPERTY
   Upon full payment, all original creative assets produced by Agency for Client
   are assigned to Client. Agency retains the right to display the work in its
   portfolio unless Client requests otherwise in writing.

4. REVISION POLICY
   The number of revision rounds per deliverable is determined by the selected
   plan (1 round for Starter, 2 for Growth, 3 for Enterprise). Revisions must
   be requested within 5 business days of delivery.

5. CONFIDENTIALITY
   Both parties agree to keep confidential any proprietary information shared
   during the engagement. This obligation survives termination of this Agreement.

6. TERMINATION
   Either party may terminate this Agreement with 30 days written notice.
   No refunds are issued for the current billing cycle upon termination.

7. LIMITATION OF LIABILITY
   Agency's total liability under this Agreement shall not exceed the total fees
   paid by Client in the 3 months preceding the event giving rise to the claim.

8. GOVERNING LAW
   This Agreement shall be governed by the laws of the Republic of India,
   and disputes shall be subject to the exclusive jurisdiction of courts in
   Mumbai, Maharashtra.

9. AMENDMENTS
   Agency may update this Agreement with 30 days' notice. Continued use of
   services after notice constitutes acceptance of the updated terms.

10. ENTIRE AGREEMENT
    This Agreement constitutes the entire agreement between the parties and
    supersedes all prior discussions and agreements relating to its subject matter.

By clicking "Accept & Continue", you acknowledge that you have read, understood,
and agree to be bound by this Master Service Agreement.

— End of Agreement —`;

export function StageTerms({ onAccepted, isSubmitting }: StageTermsProps) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    // Create observer targeting the sentinel at the bottom of the scroll area
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHasScrolled(true);
          observerRef.current?.disconnect();
        }
      },
      { root: node, threshold: 0.9 },
    );
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto rounded-2xl border border-[#C9DFF0] bg-white p-6 sm:p-8 shadow-sm"
    >
      <header className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F4FD] border border-[#C9DFF0] text-[#2B7BC4] text-xs font-semibold uppercase tracking-wider mb-3">
          Step 2 of 5
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0D2137] tracking-tight">
          Master Service Agreement
        </h2>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 leading-relaxed">
          Please review the terms of service below. Scroll to the bottom of the agreement to unlock
          the acceptance button.
        </p>
      </header>

      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className="h-80 overflow-y-auto bg-[#F8FAFC] border border-[#C9DFF0] rounded-xl p-4 sm:p-5 mb-5 font-mono text-xs text-[#334155] leading-relaxed whitespace-pre-wrap select-text scroll-smooth shadow-inner"
      >
        {MSA_TEXT}
        {/* IntersectionObserver sentinel */}
        <div ref={sentinelRef} className="h-1 mt-2" aria-hidden="true" />
      </div>

      {/* Scroll hint */}
      {!hasScrolled && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-2"
        >
          <span>↓</span>
          <span>Please scroll to the end of the agreement to continue.</span>
        </motion.p>
      )}

      {hasScrolled && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-2"
        >
          <span>✓</span>
          <span>You have read and scrolled through the full agreement.</span>
        </motion.p>
      )}

      <motion.button
        id="accept-terms-btn"
        type="button"
        onClick={onAccepted}
        disabled={!hasScrolled || isSubmitting}
        whileHover={hasScrolled && !isSubmitting ? { scale: 1.01 } : {}}
        whileTap={hasScrolled && !isSubmitting ? { scale: 0.99 } : {}}
        className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all shadow-sm ${
          hasScrolled && !isSubmitting
            ? "bg-[#2B7BC4] text-white hover:bg-[#1A5EA8] cursor-pointer"
            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
        }`}
      >
        {isSubmitting ? "Accepting Terms…" : "Accept Agreement & Continue to Payment →"}
      </motion.button>
    </motion.div>
  );
}
