import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Archive, AlertTriangle, Loader2 } from "lucide-react";
import { withdrawDeliverable } from "../../lib/deliverables-api";

export interface WithdrawDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliverableId: string;
  deliverableTitle?: string;
  onSuccess?: () => void;
}

export function WithdrawDeliverableModal({
  isOpen,
  onClose,
  deliverableId,
  deliverableTitle,
  onSuccess,
}: WithdrawDeliverableModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please specify a reason for withdrawing/deleting this approved deliverable.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await withdrawDeliverable(deliverableId, reason.trim());
      setReason("");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to withdraw deliverable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#161F2D] border border-rose-500/30 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-[#2A3446]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Withdraw / Archive Deliverable</h3>
              <p className="text-xs text-[#97A0B3] truncate max-w-sm">
                {deliverableTitle || "Retract approved asset"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-[#2A3446] bg-[#0B111C] flex items-center justify-center text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-200 mb-1">Accountability & Archival Notice</p>
            <p>
              Even after Team Lead approval, deliverables with minor issues can be safely retracted. The asset will be <strong>archived</strong> (not permanently erased) so previous versions can be reviewed, and this deletion record will be visible to the client for transparent communication.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700 text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#F1F5F9] uppercase tracking-wider mb-1.5">
              Reason for Withdrawal / Deletion <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Minor typo identified in hook caption; withdrawing for quick polish before client publishing..."
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 text-xs text-white placeholder-[#97A0B3] focus:border-rose-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="pt-2 border-t border-[#2A3446] flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#2A3446] bg-[#0B111C] text-xs font-semibold text-white hover:bg-[#161F2D] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Archiving...
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" /> Confirm Withdrawal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
