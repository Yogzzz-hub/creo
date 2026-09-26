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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl border border-[#2A3446] max-h-[92vh] overflow-y-auto text-[#F8FAFC]">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 size-8 rounded-full bg-[#0B111C] border border-[#2A3446] text-[#97A0B3] hover:bg-[#2A3446] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3 animate-[zoomIn_0.2s_ease-out]">
            <div className="size-14 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Call Request Confirmed!</h3>
            <p className="text-xs text-[#97A0B3] max-w-xs mx-auto leading-relaxed">
              Our Agency Director has received your plan negotiation request. We will connect with you at{" "}
              <strong className="text-white">{phoneNumber}</strong> ({preferredTime}).
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-[#2A3446]">
              <div className="size-10 rounded-2xl bg-[#0B111C] border border-[#2A3446] text-[#7FA0D6] flex items-center justify-center shrink-0 shadow-sm">
                <PhoneCall className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F8FAFC] tracking-tight">
                  Book a Plan Negotiation Call
                </h3>
                <p className="text-xs text-[#97A0B3] mt-0.5">
                  Bargain custom rates, adjust deliverable quotas, or create a tailored retainer with our Executive Director.
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
              <label className="block text-xs font-semibold text-[#F8FAFC]">
                What would you like to negotiate?
              </label>
              <select
                value={targetTopic}
                onChange={(e) => setTargetTopic(e.target.value)}
                className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
              >
                {TOPICS.map((topic) => (
                  <option key={topic} value={topic} className="bg-[#0B111C] text-[#F8FAFC]">
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            {/* Proposed Budget or Offer */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#F8FAFC]">
                Your Proposed Budget / Scope Target (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={proposedOffer}
                  onChange={(e) => setProposedOffer(e.target.value)}
                  placeholder="e.g. Looking for 10 reels at ₹35,000/mo or 15% startup discount"
                  className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#F8FAFC]">
                Contact Phone / WhatsApp Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
              />
            </div>

            {/* Preferred Call Time */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#F8FAFC]">
                Preferred Call Window
              </label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot} className="bg-[#0B111C] text-[#F8FAFC]">
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#F8FAFC]">
                Additional Notes / Deliverable Needs (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Share any context about your brand cadence, team size, or turnaround needs..."
                className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#97A0B3]/50 focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6] resize-none"
              />
            </div>

            {/* Direct WhatsApp Call Shortcut */}
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-200">
                <MessageSquare className="size-4 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold text-emerald-300">Want to talk immediately?</p>
                  <p className="text-[10px] text-emerald-400/80">Connect via direct WhatsApp audio call</p>
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
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#97A0B3] hover:bg-[#0B111C] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-[#BCCCE6] hover:bg-white text-[#0B111C] text-xs font-bold transition-all shadow-md shadow-[#BCCCE6]/20 inline-flex items-center gap-1.5 cursor-pointer"
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
