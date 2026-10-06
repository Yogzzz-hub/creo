import { AlertCircle, Check, Clapperboard, Palette, Target } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AllocationStatus = "working" | "success" | "error";

interface PodAllocationModalProps {
  open: boolean;
  status: AllocationStatus;
  /** Human labels derived from the questionnaire, used to personalise the match cards */
  aesthetic: string;
  outcome: string;
  onDone: () => void;
  onRetry: () => void;
  onClose: () => void;
  errorMessage?: string | null;
}

const PHASES = [
  { until: 25, label: "Extracting Brand DNA & voice vectors…" },
  { until: 55, label: "Evaluating visual style & industry benchmarks…" },
  { until: 85, label: "Matching available editors & motion specialists…" },
  { until: 100, label: "Finalizing creative pod & generating workspace…" },
];

/** The allocation request itself is fast; keep the sequence readable rather than flashing past. */
const MIN_VISIBLE_MS = 1800;
const SUCCESS_HOLD_MS = 900;

export function PodAllocationModal({
  open,
  status,
  aesthetic,
  outcome,
  onDone,
  onRetry,
  onClose,
  errorMessage,
}: PodAllocationModalProps) {
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const openedAt = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Reset every time the modal opens (including retries)
  useEffect(() => {
    if (open && status === "working") {
      openedAt.current = performance.now();
      setProgress(0);
      setShowSuccess(false);
    }
  }, [open, status]);

  // Ease toward 92% while the request is in flight
  useEffect(() => {
    if (!open || status !== "working") return;
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + Math.max(0.6, (92 - p) * 0.06)));
    }, 60);
    return () => window.clearInterval(id);
  }, [open, status]);

  // Request finished: respect the minimum sequence, fill to 100%, show the check, then continue
  useEffect(() => {
    if (!open || status !== "success") return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - openedAt.current));
    const t1 = window.setTimeout(() => setProgress(100), wait);
    const t2 = window.setTimeout(() => setShowSuccess(true), wait + 450);
    const t3 = window.setTimeout(() => doneRef.current(), wait + 450 + SUCCESS_HOLD_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [open, status]);

  // Block page scroll behind the overlay
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const phaseIndex = PHASES.findIndex((p) => progress < p.until);
  const activePhase = phaseIndex === -1 ? PHASES.length - 1 : phaseIndex;

  const cards = [
    {
      at: 20,
      icon: Palette,
      title: "Art Director Match",
      body: `Matched on your ${aesthetic} aesthetic`,
    },
    {
      at: 52,
      icon: Clapperboard,
      title: "Lead Video Editor",
      body: "Assigned: specialist in high-retention short-form",
    },
    {
      at: 80,
      icon: Target,
      title: "Content Strategist",
      body: `Tuned to your primary outcome: ${outcome}`,
    },
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="pod-allocation"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pod-allocation-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[rgba(5,8,16,0.85)] backdrop-blur-md"
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[#2A3446] bg-[#161F2D] p-6 sm:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
          >
            {/* Soft radial glow */}
            <div className="pointer-events-none absolute -top-32 left-1/2 size-80 -translate-x-1/2 rounded-full bg-[#7FA0D6]/15 blur-3xl" />

            <div className="relative">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#2A3446] bg-[#0B111C]">
                  <AnimatePresence mode="wait" initial={false}>
                    {status === "error" ? (
                      <motion.span
                        key="err"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <AlertCircle className="size-6 text-[#D8BF9B]" />
                      </motion.span>
                    ) : showSuccess ? (
                      <motion.span
                        key="ok"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 380, damping: 18 }}
                        className="flex size-9 items-center justify-center rounded-full bg-[#7FA0D6] text-[#0B111C] shadow-[0_0_24px_rgba(127,160,214,0.6)]"
                      >
                        <Check className="size-5" strokeWidth={3} />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="spin"
                        className="relative flex size-6 items-center justify-center"
                      >
                        <span className="absolute inset-0 rounded-full border-2 border-[#2A3446]" />
                        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#7FA0D6]" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7FA0D6]">
                    Step 4 · Creative pod
                  </p>
                  <h2
                    id="pod-allocation-title"
                    className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-[#F8FAFC]"
                  >
                    {status === "error"
                      ? "We couldn't finish allocating your pod"
                      : showSuccess
                        ? "Your creative pod is ready"
                        : "Allocating your creative pod"}
                  </h2>
                </div>
              </div>

              {status === "error" ? (
                <div className="mt-6 space-y-5">
                  <p className="text-sm leading-relaxed text-[#97A0B3]">
                    {errorMessage ||
                      "Something interrupted the allocation. Your answers are saved — you can safely try again."}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onRetry}
                      className="rounded-xl bg-[#BCCCE6] px-5 py-2.5 text-sm font-bold text-[#0B111C] transition-colors hover:bg-white"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-[#2A3446] px-5 py-2.5 text-sm font-semibold text-[#97A0B3] transition-colors hover:text-[#F8FAFC]"
                    >
                      Back to questionnaire
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Progress */}
                  <div className="mt-7">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={showSuccess ? "done" : activePhase}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                          className="text-[#BCCCE6]"
                        >
                          {showSuccess
                            ? "Workspace generated — launching Step 5…"
                            : PHASES[activePhase]?.label}
                        </motion.span>
                      </AnimatePresence>
                      <span className="tabular-nums text-[#97A0B3]">{Math.round(progress)}%</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-[#0B111C] ring-1 ring-[#2A3446]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#7FA0D6] to-[#BCCCE6] shadow-[0_0_16px_rgba(127,160,214,0.7)]"
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "easeOut", duration: 0.3 }}
                      />
                    </div>

                    {/* Phase tracker */}
                    <ol className="mt-4 grid grid-cols-4 gap-2">
                      {PHASES.map((p, i) => {
                        const done = showSuccess || i < activePhase;
                        const current = !showSuccess && i === activePhase;
                        return (
                          <li key={p.label} className="flex flex-col gap-1.5">
                            <span
                              className={`h-1 rounded-full transition-colors duration-500 ${
                                done ? "bg-[#7FA0D6]" : current ? "bg-[#BCCCE6]/60" : "bg-[#2A3446]"
                              }`}
                            />
                            <span
                              className={`text-[11px] font-medium ${done || current ? "text-[#BCCCE6]" : "text-[#97A0B3]/70"}`}
                            >
                              {["Brand DNA", "Benchmarks", "Matching", "Workspace"][i]}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  {/* Live match cards */}
                  <div className="mt-6 space-y-2.5 min-h-[196px]">
                    <AnimatePresence>
                      {cards
                        .filter((c) => progress >= c.at || showSuccess)
                        .map((c) => {
                          const Icon = c.icon;
                          return (
                            <motion.div
                              key={c.title}
                              initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ type: "spring", stiffness: 320, damping: 26 }}
                              className="flex items-center gap-3.5 rounded-xl border border-[#2A3446] bg-[#0B111C]/80 px-4 py-3"
                            >
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7FA0D6]/30 bg-[#7FA0D6]/10 text-[#7FA0D6]">
                                <Icon className="size-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#F8FAFC]">{c.title}</p>
                                <p className="text-xs leading-snug text-[#97A0B3]">{c.body}</p>
                              </div>
                              <Check
                                className="ml-auto size-4 shrink-0 text-[#7FA0D6]"
                                strokeWidth={3}
                              />
                            </motion.div>
                          );
                        })}
                    </AnimatePresence>
                  </div>

                  <p className="mt-5 text-xs leading-relaxed text-[#97A0B3]">
                    Your full brand brief is prepared for your team lead and specialists behind the
                    scenes — you don't need to wait for it.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default PodAllocationModal;
