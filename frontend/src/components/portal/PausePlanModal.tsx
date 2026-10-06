import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  PauseCircle,
  X,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { request } from "../../lib/http";

interface PausePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  planName: string;
  renewalDate: string;
}

const REASONS = [
  "Campaign / marketing hiatus",
  "Backlog of content to publish first",
  "Traveling / Team out of office",
  "Seasonal business break",
  "Budget reallocation",
  "Other reason",
];

export function PausePlanModal({
  isOpen,
  onClose,
  onSuccess,
  planName,
  renewalDate,
}: PausePlanModalProps) {
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleConfirmPause = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await request("/api/v1/payments/subscription/pause", {
        method: "POST",
        body: JSON.stringify({
          reason,
          notes: notes || undefined,
        }),
      });

      setDone(true);
      onSuccess();
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 2200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to pause subscription renewal.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] grid place-items-center p-4 sm:p-6 overflow-y-auto bg-black/80 animate-[fadeIn_0.15s_ease-out]"
      style={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-[#2A3446] max-h-[90vh] overflow-y-auto text-[#F8FAFC] m-auto animate-[zoomIn_0.2s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close modal"
          className="absolute top-5 right-5 size-8 rounded-full bg-[#0B111C] border border-[#2A3446] text-[#97A0B3] hover:bg-[#2A3446] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {done ? (
          <div className="py-8 text-center space-y-3 animate-[zoomIn_0.2s_ease-out]">
            <div className="size-14 rounded-full bg-amber-950/60 border border-amber-600/60 text-amber-400 mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Plan Renewal Scheduled to Pause</h3>
            <p className="text-xs text-[#97A0B3] max-w-sm mx-auto leading-relaxed">
              Your {planName} plan remains 100% active until <strong className="text-white">{renewalDate}</strong>.
              AutoPay will skip the upcoming billing charge. You can resume at any time.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirmPause} className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-[#2A3446]">
              <div className="size-10 rounded-2xl bg-amber-950/40 border border-amber-700/60 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                <PauseCircle className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F8FAFC] tracking-tight">
                  Pause Next Month&apos;s Plan
                </h3>
                <p className="text-xs text-[#97A0B3] mt-0.5">
                  Effective on your renewal date: <span className="text-white font-semibold">{renewalDate}</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Key Guarantees Box */}
            <div className="rounded-2xl border border-[#2A3446] bg-[#0B111C]/80 p-3.5 space-y-2.5 text-xs text-[#BCCCE6]">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Active through {renewalDate}:</strong> All deliverables and your dedicated pod continue working normally until this cycle ends.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Zero renewal charges:</strong> UPI AutoPay / card charge will not be deducted next month.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <RotateCcw className="size-4 text-[#7FA0D6] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Resume anytime:</strong> Re-activate your plan with a single click whenever you are ready.
                </span>
              </div>
            </div>

            {/* Reason Selector */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#F8FAFC]">
                Reason for pause (Optional feedback)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r} className="bg-[#0B111C] text-[#F8FAFC]">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#F8FAFC]">
                Additional instructions or notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Let your account director know if you need anything wrapped up before the pause..."
                className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6] resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#97A0B3] hover:bg-[#0B111C] hover:text-white transition-colors cursor-pointer"
              >
                Keep Plan Active
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0B111C] text-xs font-bold transition-all shadow-md shadow-amber-500/20 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <PauseCircle className="size-3.5" />}
                <span>Confirm Pause for Next Month</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
