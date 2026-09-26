import { motion } from "motion/react";
/**
 * Stage 2 — MSA (Master Service Agreement) acceptance.
 *
 * The Accept button is DISABLED until the user has scrolled to the bottom
 * of the agreement text. An IntersectionObserver on a sentinel element
 * (not a timer) detects this.
 */
import { useCallback, useRef, useState } from "react";

import { Clock, Check, FileText, ChevronRight, Lock } from "lucide-react";
interface StageTermsProps {
  userId: string;
  onAccepted: () => void;
  onBack?: () => void;
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

export function StageTerms({ onAccepted, onBack, isSubmitting }: StageTermsProps) {
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
      className="max-w-[1400px] w-full mx-auto space-y-4 pb-12"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-6 sm:p-8 shadow-xl h-full flex flex-col">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7FA0D6]/20 border border-[#7FA0D6]/30 text-[#BCCCE6] text-[10px] font-bold uppercase tracking-wider mb-4 shadow-sm w-fit">
              Step 2 of 5
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-[#F8FAFC] tracking-tight mb-2">
              Master Service Agreement
            </h2>
            <p className="text-xs sm:text-sm text-[#97A0B3] mb-6 leading-relaxed">
              Please review the terms of service below. Scroll to the bottom of the agreement to unlock the acceptance button.
            </p>

            <div className="rounded-xl border border-[#2A3446] bg-[#0B111C] p-4 mb-4">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2A3446]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F8FAFC]">
                  <FileText className="w-4 h-4 text-[#7FA0D6]" />
                  Document Highlights
                </div>
                <div className="text-[9px] font-bold text-[#97A0B3] bg-[#161F2D] border border-[#2A3446] px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> SLA Rev 2026.09 • Enforced
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#161F2D] border border-[#2A3446] p-3 rounded-lg shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-[#F8FAFC]">01. Scope of Services</p>
                    <p className="text-[10px] text-[#97A0B3] mt-0.5">Content creation, identity, campaigns</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7FA0D6]" />
                </div>
                <div className="flex items-center justify-between bg-[#161F2D] border border-[#2A3446] p-3 rounded-lg shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-[#F8FAFC]">02. Payment Terms</p>
                    <p className="text-[10px] text-[#97A0B3] mt-0.5">Billing cycles & 7-day grace period</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7FA0D6]" />
                </div>
              </div>
            </div>

            {!hasScrolled ? (
              <div className="bg-[#D8BF9B]/10 border border-[#D8BF9B]/30 rounded-xl p-4 flex items-start gap-3 mt-auto">
                <Clock className="w-5 h-5 text-[#D8BF9B] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#D8BF9B]">Reading in progress...</p>
                  <p className="text-[11px] text-[#D8BF9B]/80 font-medium mt-0.5">Scroll document to unlock</p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 flex items-start gap-3 mt-auto">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">Reading complete</p>
                  <p className="text-[11px] text-emerald-300/80 font-medium mt-0.5">You can now accept the agreement</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-6 sm:p-8 shadow-xl flex flex-col h-full relative overflow-hidden">
            
            {/* PDF Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#2A3446]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0B111C] flex items-center justify-center text-[#7FA0D6] shrink-0 border border-[#2A3446]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F8FAFC]">creo_master_agreement_2026.pdf</h3>
                  <p className="text-[11px] text-[#97A0B3] mt-0.5 font-medium">Last updated: January 2025</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-32">
                <div className="flex-1 h-1.5 bg-[#0B111C] border border-[#2A3446] rounded-full overflow-hidden">
                  <div className={`h-full bg-[#7FA0D6] transition-all duration-300 ${hasScrolled ? 'w-full' : 'w-[5%]'}`} />
                </div>
                <span className="text-[10px] font-bold text-[#BCCCE6]">{hasScrolled ? '100%' : '0%'}</span>
              </div>
            </div>

            {/* Scroll container */}
            <div
              ref={scrollContainerRef}
              className="flex-1 min-h-[300px] h-[50vh] max-h-[600px] overflow-y-auto bg-[#0B111C] border border-[#2A3446] rounded-xl p-6 sm:p-8 mb-6 font-mono text-[11px] sm:text-xs text-[#97A0B3] leading-relaxed whitespace-pre-wrap select-text scroll-smooth shadow-inner relative"
            >
              {MSA_TEXT}
              {/* IntersectionObserver sentinel */}
              <div ref={sentinelRef} className="h-1 mt-6" aria-hidden="true" />
            </div>

            {hasScrolled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 px-4 py-3 rounded-xl flex items-center gap-2 mt-auto"
              >
                <div className="size-5 rounded-full bg-emerald-500 text-[#0B111C] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>You have read and scrolled through the full agreement.</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto py-3 px-6 rounded-full bg-[#0B111C] border border-[#2A3446] text-sm font-bold text-[#97A0B3] hover:text-[#F8FAFC] hover:border-[#7FA0D6] shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
          >
            <span>← Back to Step 1</span>
          </button>
        ) : <div />}

        <motion.button
          id="accept-terms-btn"
          type="button"
          onClick={onAccepted}
          disabled={!hasScrolled || isSubmitting}
          whileHover={hasScrolled && !isSubmitting ? { scale: 1.02 } : {}}
          whileTap={hasScrolled && !isSubmitting ? { scale: 0.98 } : {}}
          className={`w-full sm:w-auto min-w-[280px] py-3 px-8 rounded-full font-bold text-sm transition-all shadow-md ${
            hasScrolled && !isSubmitting
              ? "bg-[#BCCCE6] text-[#0B111C] cursor-pointer hover:bg-white shadow-[#BCCCE6]/20"
              : "bg-[#2A3446] text-[#97A0B3] cursor-not-allowed shadow-none"
          }`}
        >
          {isSubmitting ? "Accepting Terms…" : "Accept Agreement & Continue to Payment →"}
        </motion.button>
      </div>
    </motion.div>
  );
}
