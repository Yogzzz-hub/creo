import { motion } from "motion/react";
/**
 * Stage 2 — MSA (Master Service Agreement) acceptance.
 *
 * Presents the agreement, reading progress, and the existing acceptance action.
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

4. REVISION POLICY & SLA TURNAROUNDS
   The number of revision rounds per deliverable is determined by the selected
   plan (1 round for Starter, 2 for Growth, 3 for Scale). Standard turnarounds:
   Starter (3 business days), Growth (2 business days), Scale (1 business day).
   Revisions must be requested within 5 business days of delivery.

5. CONFIDENTIALITY
   Both parties agree to keep confidential any proprietary information shared
   during the engagement. This obligation survives termination of this Agreement.

6. TERMINATION & CANCELLATION
   Client may cancel their subscription retainer at any time. Subscriptions are billed
   month-to-month. Cancellation takes effect at the end of the current billing cycle.
   No written notice requirement or cancellation fees apply.

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

// Preserve the agreement wording while removing plain-text line wrapping.
const AGREEMENT_BLOCKS = MSA_TEXT.split(/\n\s*\n/).map((block) => block.trim());

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
      className="w-full space-y-4 pb-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT COLUMN: Summary, Checklist & Instant Action */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-xl h-full flex flex-col gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-app-accent/20 border border-app-accent/30 text-app-accent-soft text-[11px] font-bold uppercase tracking-wider mb-3 shadow-sm w-fit">
                Step 2 of 5 · Service agreement
              </div>
              <h2 className="text-2xl sm:text-[28px] font-bold font-display text-hi tracking-tight leading-tight mb-3">
                Review your agreement
              </h2>
              <p className="text-sm text-app-mist leading-relaxed">
                Read how we work together, then accept the agreement to choose your production plan.
              </p>
            </div>

            <div className="space-y-4 border-t border-app-line pt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-app-accent">What this covers</p>
              {[
                ["Services & delivery", "Scope of work, revisions, and turnaround times."],
                ["Billing & cancellation", "Payment cycles and subscription terms."],
                ["Ownership & privacy", "Creative asset rights and confidentiality."],
              ].map(([heading, detail]) => (
                <div key={heading}>
                  <p className="text-sm font-semibold text-app-ink">{heading}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-app-mist">{detail}</p>
                </div>
              ))}
            </div>

            {/* Quick Action Card inside Left Column */}
            <div className="rounded-xl border border-app-line bg-app-base p-4 space-y-2 lg:mt-auto">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed || hasScrolled || isAlreadyAccepted}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setHasScrolled(true);
                  }}
                  className="mt-0.5 size-4 shrink-0 rounded border-app-line bg-app-surface accent-app-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent cursor-pointer"
                />
                <span className="text-sm text-app-accent-soft leading-relaxed">
                  I have read and agree to the Master Service Agreement.
                </span>
              </label>
              {(agreed || hasScrolled || isAlreadyAccepted) && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium pl-6">
                  <Check className="size-3" />
                  <span>Terms acknowledged</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Document Viewer */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-xl flex flex-col h-full relative overflow-hidden min-w-0">
            {/* Document Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-app-line">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-app-base flex items-center justify-center text-app-accent shrink-0 border border-app-line">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 id="agreement-reader-title" className="text-base font-semibold text-hi">Master Service Agreement</h3>
                  <p className="mt-0.5 text-xs text-app-mist">Creo Digital Agency · Full agreement</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {!hasScrolled && !isAlreadyAccepted && (
                  <button
                    type="button"
                    onClick={handleScrollToBottom}
                    className="text-[11px] font-semibold text-app-accent hover:text-hi bg-app-base border border-app-line px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    View end ↓
                  </button>
                )}
                <div role="progressbar" aria-label="Agreement reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scrollProgress} className="w-24 sm:w-28 h-2 bg-app-base border border-app-line rounded-full overflow-hidden">
                  <div
                    className="h-full bg-app-accent transition-all duration-200 text-app-on-accent!"
                    style={{ width: `${scrollProgress}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-bold text-app-accent-soft w-8 text-right">
                  {scrollProgress}%
                </span>
              </div>
            </div>

            {/* Scroll Container */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              role="region"
              aria-labelledby="agreement-reader-title"
              tabIndex={0}
              className="h-[300px] sm:h-[380px] lg:h-[400px] overflow-y-auto bg-app-base border border-app-line rounded-xl p-4 sm:p-6 text-sm sm:text-[15px] text-app-accent-soft leading-7 select-text scroll-smooth shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
            >
              <div className="max-w-[65ch] space-y-5">
                {AGREEMENT_BLOCKS.map((block, index) => {
                  const [firstLine = "", ...lines] = block.split("\n");
                  if (/^\d+\./.test(firstLine)) {
                    return (
                      <section key={index} className="space-y-2">
                        <h4 className="text-sm font-bold tracking-wide text-hi">{firstLine}</h4>
                        <p>{lines.join(" ").replace(/\s+/g, " ").trim()}</p>
                      </section>
                    );
                  }
                  return <p key={index} className={index === 0 ? "text-base font-semibold text-hi" : undefined}>{block.replace(/\s+/g, " ")}</p>;
                })}
              </div>
              <div ref={sentinelRef} className="h-4 mt-6 flex items-center justify-center text-app-accent text-xs font-sans" aria-hidden="true">
                ✓ Reached End of Master Service Agreement
              </div>
            </div>

            {/* Status under document */}
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              {isUnlocked ? (
                <div className="text-xs font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-xl flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>Ready for Step 3: Choose your plan</span>
                </div>
              ) : (
                <div className="text-xs text-app-mist flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-app-warm" />
                  <span>Review the agreement before continuing.</span>
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
      <div className="sticky bottom-2 sm:bottom-4 z-20 rounded-2xl border border-app-line bg-app-surface/95 backdrop-blur-md p-3.5 sm:p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-app-base border border-app-line text-xs sm:text-sm font-bold text-app-mist hover:text-hi hover:border-app-accent shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to email verification</span>
          </button>
        ) : <div />}

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            id="accept-terms-btn"
            type="button"
            onClick={handleProceed}
            disabled={isSubmitting}
            className="w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-sm transition-all shadow-md bg-app-accent-soft text-app-base enabled:hover:bg-hi enabled:hover:shadow-lg shadow-app-accent-soft/20 cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>
              {isSubmitting
                ? "Saving agreement…"
                : isAlreadyAccepted
                ? "Continue to plan selection"
                : "Accept agreement & choose plan"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default StageTerms;
