import { NativeSelect } from "../../ui/NativeSelect";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  PhoneCall,
  X,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../ui/ConfirmDialog";

interface PlanBargainCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTopic?: string;
}

const TOPICS = [
  "Custom Pricing / Retainer Discount",
  "Custom Quotas (More Reels / Stories)",
  "Multi-Brand / Enterprise Volume Package",
  "Plan Consultation (Starter vs Accelerator vs Enterprise)",
];

const TIME_SLOTS = [
  "Immediate / ASAP (Next 30 mins)",
  "Today Afternoon (2:00 PM - 5:00 PM)",
  "Today Evening (6:00 PM - 9:00 PM)",
  "Tomorrow Morning (10:00 AM - 1:00 PM)",
];

export function PlanBargainCallModal({
  isOpen,
  onClose,
  onSuccess,
  initialTopic,
}: PlanBargainCallModalProps) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [targetTopic, setTargetTopic] = useState(initialTopic || TOPICS[0] || "Plan Consultation");
  const [proposedOffer, setProposedOffer] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [preferredTime, setPreferredTime] = useState(TIME_SLOTS[0] || "Immediate / ASAP");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (initialTopic) {
      setTargetTopic(initialTopic);
    }
  }, [initialTopic]);

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

  const clientName = user?.full_name || user?.email?.split("@")[0] || "Client";
  const clientEmail = user?.email || "";

  // WhatsApp Pre-composed Direct Link
  const waText = encodeURIComponent(
    `Hi Creo Admin, I am ${clientName} (${clientEmail}). I would like to negotiate a custom plan/pricing for my brand.
` +
      `• Target Topic: ${targetTopic}
` +
      (proposedOffer ? `• Proposed Scope / Budget: ${proposedOffer}
` : "") +
      (phoneNumber ? `• Contact Phone: ${phoneNumber}
` : "") +
      `• Preferred Time: ${preferredTime}
` +
      (notes ? `• Notes: ${notes}` : "")
  );
  const waUrl = `https://wa.me/919941999415?text=${waText}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError("Please provide a contact phone number so your agency team can reach you.");
      return;
    }

    const shouldSendRequest = await confirm({
      title: "Send this call request?",
      description: "Your agency’s responsible team will receive the plan consultation details.",
      details: [targetTopic, `Contact: ${phoneNumber}`, `Preferred time: ${preferredTime}`],
      confirmText: "Send call request",
      cancelText: "Review details",
      tone: "info",
      icon: "info",
    });
    if (!shouldSendRequest) return;

    try {
      setLoading(true);
      setError(null);
      await request("/api/v1/portal/book-call", {
        method: "POST",
        body: JSON.stringify({
          target_topic: targetTopic,
          proposed_offer: proposedOffer || undefined,
          phone_number: phoneNumber,
          preferred_time: preferredTime,
          notes: notes || undefined,
        }),
      });

      setSubmitted(true);
      onSuccess?.();
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit call request.";
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
        className="relative w-full max-w-lg rounded-3xl bg-app-surface p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgb(var(--shadow-rgb)/calc(0.85*var(--shadow-k)))] border border-app-line max-h-[90vh] overflow-y-auto text-app-ink m-auto animate-[zoomIn_0.2s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close modal"
          className="absolute top-5 right-5 size-8 rounded-full bg-app-base border border-app-line text-app-mist hover:bg-app-line hover:text-hi flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3 animate-[zoomIn_0.2s_ease-out]">
            <div className="size-14 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-app-ink">Call request sent</h3>
            <p className="text-xs text-app-mist max-w-xs mx-auto leading-relaxed">
              Your agency team has received the plan consultation request. They will contact you at{" "}
              <strong className="text-hi">{phoneNumber}</strong> ({preferredTime}).
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-app-line">
              <div className="size-10 rounded-2xl bg-app-base border border-app-line text-app-accent flex items-center justify-center shrink-0 shadow-sm">
                <PhoneCall className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-app-ink tracking-tight">
                  Book a Plan Consultation Call
                </h3>
                <p className="text-xs text-app-mist mt-0.5">
                  Discuss custom video deliverables or negotiate a tailored plan with our executive team.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Negotiation Topic */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-app-ink">
                What would you like to negotiate?
              </label>
              <NativeSelect
                value={targetTopic}
                onChange={(e) => setTargetTopic(e.target.value)}
                className="w-full rounded-xl border border-app-line bg-app-base px-3 py-2 text-xs text-app-ink focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent"
              >
                {targetTopic && !TOPICS.includes(targetTopic) && (
                  <option value={targetTopic}>{targetTopic}</option>
                )}
                {TOPICS.map((topic) => (
                  <option key={topic} value={topic} className="bg-app-base text-app-ink">
                    {topic}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {/* Proposed Budget or Offer */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-app-ink">
                Your Proposed Budget / Scope Target (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={proposedOffer}
                  onChange={(e) => setProposedOffer(e.target.value)}
                  placeholder="e.g. Looking for 10 reels at ₹35,000/mo or 15% startup discount"
                  className="w-full rounded-xl border border-app-line bg-app-base px-3 py-2 text-xs text-app-ink placeholder-app-mist/50 focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-app-ink">
                Contact Phone / WhatsApp Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full rounded-xl border border-app-line bg-app-base px-3 py-2 text-xs text-app-ink placeholder-app-mist/50 focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent"
              />
            </div>

            {/* Preferred Call Time */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-app-ink">
                Preferred Call Window
              </label>
              <NativeSelect
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full rounded-xl border border-app-line bg-app-base px-3 py-2 text-xs text-app-ink focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot} className="bg-app-base text-app-ink">
                    {slot}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-app-ink">
                Additional Notes / Deliverable Needs (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Share any context about your brand cadence, team size, or turnaround needs..."
                className="w-full rounded-xl border border-app-line bg-app-base px-3 py-2 text-xs text-app-ink placeholder-app-mist/50 focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent resize-none"
              />
            </div>

            {/* Direct WhatsApp Call Shortcut */}
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-200">
                <MessageSquare className="size-4 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold text-emerald-300">Want to talk immediately?</p>
                  <p className="text-[11px] text-emerald-400/80">Connect via direct WhatsApp audio call</p>
                </div>
              </div>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
              >
                <span>Call Now</span>
                <ArrowUpRight className="size-3" />
              </a>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-app-line">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-app-mist hover:bg-app-base hover:text-hi transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-app-accent-soft hover:bg-hi text-app-base text-xs font-bold transition-all shadow-md shadow-app-accent-soft/20 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                <span>Submit Call Request</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
