import { useState } from "react";
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

interface PlanBargainCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TOPICS = [
  "Custom Pricing / Retainer Discount",
  "Custom Quotas (More Reels / Stories)",
  "Multi-Brand / Enterprise Volume Package",
  "Plan Consultation (Starter vs Accelerator vs Enterprise)",
];

const TIME_SLOTS = [
  "Immediate / ASAP (Next 30 mins)",
  "Today Afternoon (2:00 PM – 5:00 PM)",
  "Today Evening (6:00 PM – 9:00 PM)",
  "Tomorrow Morning (10:00 AM – 1:00 PM)",
];

export function PlanBargainCallModal({ isOpen, onClose, onSuccess }: PlanBargainCallModalProps) {
  const { user } = useAuth();
  const [targetTopic, setTargetTopic] = useState(TOPICS[0]);
  const [proposedOffer, setProposedOffer] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [preferredTime, setPreferredTime] = useState(TIME_SLOTS[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const clientName = user?.full_name || user?.email?.split("@")[0] || "Client";
  const clientEmail = user?.email || "";

  // WhatsApp Pre-composed Direct Link
  const waText = encodeURIComponent(
    `Hi Creo Admin, I am ${clientName} (${clientEmail}). I would like to negotiate a custom plan/pricing for my brand.\n` +
      `• Target Topic: ${targetTopic}\n` +
      (proposedOffer ? `• Proposed Scope / Budget: ${proposedOffer}\n` : "") +
      (phoneNumber ? `• Contact Phone: ${phoneNumber}\n` : "") +
      `• Preferred Time: ${preferredTime}\n` +
      (notes ? `• Notes: ${notes}` : "")
  );
  const waUrl = `https://wa.me/919941999415?text=${waText}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError("Please provide a contact phone number so our Agency Director can reach you.");
      return;
    }

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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-[#E2E8F0] max-h-[92vh] overflow-y-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 size-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-[#0F172A] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3 animate-[zoomIn_0.2s_ease-out]">
            <div className="size-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A]">Call Request Confirmed!</h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
              Our Agency Director has received your plan negotiation request. We will connect with you at{" "}
              <strong className="text-[#0F172A]">{phoneNumber}</strong> ({preferredTime}).
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
              <div className="size-10 rounded-2xl bg-gradient-to-br from-[#0052FF] to-[#0045D8] text-white flex items-center justify-center shrink-0 shadow-xs">
                <PhoneCall className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  Book a Plan Negotiation Call
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bargain custom rates, adjust deliverable quotas, or create a tailored retainer with our Executive Director.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Negotiation Topic */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0F172A]">
                What would you like to negotiate?
              </label>
              <select
                value={targetTopic}
                onChange={(e) => setTargetTopic(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF]"
              >
                {TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            {/* Proposed Budget or Offer */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Your Proposed Budget / Scope Target (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={proposedOffer}
                  onChange={(e) => setProposedOffer(e.target.value)}
                  placeholder="e.g. Looking for 10 reels at ₹35,000/mo or 15% startup discount"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF]"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Contact Phone / WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF]"
              />
            </div>

            {/* Preferred Call Time */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Preferred Call Window
              </label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF]"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Additional Notes / Deliverable Needs (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Share any context about your brand cadence, team size, or turnaround needs..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] resize-none"
              />
            </div>

            {/* Direct WhatsApp Call Shortcut */}
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-900">
                <MessageSquare className="size-4 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold">Want to talk immediately?</p>
                  <p className="text-[10px] text-emerald-700">Connect via direct WhatsApp audio call</p>
                </div>
              </div>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs shrink-0"
              >
                <span>Call Now</span>
                <ArrowUpRight className="size-3" />
              </a>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                <span>Submit Call Request</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
