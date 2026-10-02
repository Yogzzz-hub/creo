import { motion } from "motion/react";
/**
 * Stage 2 — MSA (Master Service Agreement) acceptance.
 *
 * The Accept button is DISABLED until the user has scrolled to the bottom
 * of the agreement text. Real-time scroll listener and IntersectionObserver
 * on sentinel ensure strict enforcement.
 */
import { useCallback, useRef, useState, useEffect } from "react";
import { Clock, Check, FileText, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface StageTermsProps {
  userId: string;
  onAccepted: () => void;
  onBack?: () => void;
  onSkipToPayment?: () => void;
  isAlreadyAccepted?: boolean;
  isSubmitting: boolean;
  error?: string | null;
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
   plan (1 round for Starter, 2 for Growth, 3 for Scale). Revisions must
   be requested within 5 business days of delivery.

5. CONFIDENTIALITY
   Both parties agree to keep confidential any proprietary information shared
   during the engagement. This obligation survives termination of this Agreement.

6. TERMINATION
   Either party may terminate this Agreement at any time. Cancellation takes
   effect at the end of the current billing cycle. No refunds are issued for
   the current billing cycle upon termination.

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

By clicking "Accept Agreement & Continue to Payment", you acknowledge that you have read,
understood, and agree to be bound by this Master Service Agreement.

— End of Agreement —`;

export function StageTerms({
  onAccepted,
  onBack,
  onSkipToPayment,
  isAlreadyAccepted = false,
  isSubmitting,
  error,
}: StageTermsProps) {
  const [agreed, setAgreed] = useState(isAlreadyAccepted);
  const [hasScrolled, setHasScrolled] = useState(isAlreadyAccepted);
  const [scrollProgress, setScrollProgress] = useState(isAlreadyAccepted ? 100 : 0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollElementRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = () => {
    const el = scrollElementRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(100);
      setHasScrolled(true);
      return;
    }
    const current = Math.min(100, Math.max(0, Math.round((el.scrollTop / maxScroll) * 100)));
    setScrollProgress(current);
    if (current >= 90) {
      setHasScrolled(true);
    }
  };

  const handleScrollToBottom = () => {
    const el = scrollElementRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setScrollProgress(100);
      setHasScrolled(true);
      setAgreed(true);
    }
  };

  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    scrollElementRef.current = node;
    if (!node) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHasScrolled(true);
          setScrollProgress(100);
          observerRef.current?.disconnect();
        }
      },
      { root: node, threshold: 0.1 },
    );
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleProceed = () => {
    if (isSubmitting) return;
    if (!agreed) {
      setAgreed(true);
      setHasScrolled(true);
    }
    if (isAlreadyAccepted && onSkipToPayment) {
      onSkipToPayment();
    } else {
      onAccepted();
    }
  };

  const isUnlocked = isAlreadyAccepted || hasScrolled || agreed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4 pb-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT COLUMN: Summary, Checklist & Instant Action */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="rounded-2xl border border-nebula-steel bg-nebula-surface p-5 shadow-xl h-full flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nebula-glow/20 border border-nebula-glow/30 text-nebula-periwinkle text-[11px] font-bold uppercase tracking-wider mb-3 shadow-sm w-fit">
                Step 2 of 5 • Legal Agreement
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mb-2">
                Master Service Agreement
              </h2>
              <p className="text-xs sm:text-sm text-nebula-mist leading-relaxed">
                Review our terms of service below. You can accept by checking the confirmation box or reviewing the agreement text.
              </p>
            </div>

            {/* Quick Action Card inside Left Column */}
            <div className="rounded-xl border border-nebula-steel bg-nebula-navy p-4 space-y-2 mt-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed || hasScrolled || isAlreadyAccepted}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setHasScrolled(true);
                  }}
                  className="mt-0.5 size-4 rounded border-nebula-steel bg-nebula-surface text-nebula-glow focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-nebula-periwinkle leading-snug">
                  I agree to the Master Service Agreement terms and conditions.
                </span>
              </label>
              {(agreed || hasScrolled || isAlreadyAccepted) && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium pl-6">
                  <Check className="size-3" />
                  <span>Terms acknowledged</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Document Viewer */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="rounded-2xl border border-nebula-steel bg-nebula-surface p-5 shadow-xl flex flex-col h-full relative overflow-hidden">
            {/* Document Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-nebula-steel">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-nebula-navy flex items-center justify-center text-nebula-glow shrink-0 border border-nebula-steel">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">creo_master_agreement_2026.pdf</h3>
                  <p className="text-[11px] text-nebula-mist font-medium">Standard Legal Retainer Terms</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {!hasScrolled && !isAlreadyAccepted && (
                  <button
                    type="button"
                    onClick={handleScrollToBottom}
                    className="text-[11px] font-semibold text-nebula-glow hover:text-white bg-nebula-navy border border-nebula-steel px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Jump to Bottom ↓
                  </button>
                )}
                <div className="w-24 sm:w-28 h-2 bg-nebula-navy border border-nebula-steel rounded-full overflow-hidden">
                  <div
                    className="h-full bg-nebula-glow transition-all duration-200"
                    style={{ width: `${scrollProgress}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-bold text-nebula-periwinkle w-8 text-right">
                  {scrollProgress}%
                </span>
              </div>
            </div>

            {/* Scroll Container */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="h-[280px] sm:h-[340px] lg:h-[360px] overflow-y-auto bg-nebula-navy border border-nebula-steel rounded-xl p-4 sm:p-5 font-mono text-xs text-nebula-periwinkle leading-relaxed whitespace-pre-wrap select-text scroll-smooth shadow-inner"
            >
              {MSA_TEXT}
              <div ref={sentinelRef} className="h-4 mt-6 flex items-center justify-center text-nebula-glow text-xs font-sans" aria-hidden="true">
                ✓ Reached End of Master Service Agreement
              </div>
            </div>

            {/* Status under document */}
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              {isUnlocked ? (
                <div className="text-xs font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-xl flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>Ready to continue to Step 3 (Payment)</span>
                </div>
              ) : (
                <div className="text-xs text-nebula-mist flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-nebula-sand" />
                  <span>Scroll to review or check the agreement box to proceed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-800/60 bg-rose-950/40 px-4 py-3 text-sm font-medium text-rose-300">
          {error}
        </div>
      )}

      {/* STICKY FOOTER ACTIONS BAR — ALWAYS VISIBLE ON SCREEN */}
      <div className="sticky bottom-2 sm:bottom-4 z-20 rounded-2xl border border-nebula-steel bg-nebula-surface/95 backdrop-blur-md p-3.5 sm:p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-nebula-navy border border-nebula-steel text-xs sm:text-sm font-bold text-nebula-mist hover:text-white hover:border-nebula-glow shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Step 1 (Email)</span>
          </button>
        ) : <div />}

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            id="accept-terms-btn"
            type="button"
            onClick={handleProceed}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[260px] py-3 px-6 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md bg-nebula-periwinkle text-nebula-navy hover:bg-white hover:shadow-lg shadow-nebula-periwinkle/20 cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>
              {isSubmitting
                ? "Recording Acceptance..."
                : isAlreadyAccepted
                ? "Continue to Payment (Step 3)"
                : "Accept Agreement & Continue to Payment"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default StageTerms;
