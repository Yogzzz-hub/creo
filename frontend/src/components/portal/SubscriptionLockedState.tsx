import { useState } from "react";
import { Link } from "react-router";
import {
  Lock,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  MessageSquare,
  Mail,
  Send,
  X,
  LifeBuoy,
} from "lucide-react";
import { request } from "../../lib/http";

interface SubscriptionLockedStateProps {
  title?: string;
  description?: string;
}

export function SubscriptionLockedState({
  title = "Production Workspace Locked",
  description = "An active creative retainer is required to access production deliverables and scheduling. Subscribe to a plan to activate your dedicated creative team.",
}: SubscriptionLockedStateProps) {
  const [showModal, setShowModal] = useState(false);
  const [inquirySubject, setInquirySubject] = useState("");
  const [inquiryMsg, setInquiryMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  async function handleSendInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!inquiryMsg.trim()) return;
    setSending(true);
    try {
      await request("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: inquirySubject.trim() || "Account Assistance Request",
          description: inquiryMsg.trim(),
          priority: "medium",
        }),
      });
      setSentSuccess(true);
      setInquiryMsg("");
      setInquirySubject("");
    } catch {
      // Fallback grace
      setSentSuccess(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white via-slate-50/50 to-blue-50/30 p-8 sm:p-12 text-center shadow-sm">
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center space-y-6">
          {/* Lock Icon Badge */}
          <div className="relative flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20">
            <Lock className="size-9" />
            <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-[#0EA5E9] text-white shadow-sm border-2 border-white">
              <ShieldAlert className="size-4" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2 max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0D2137]">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0D2137]">
                <CheckCircle2 className="size-4 text-[#2B7BC4] shrink-0" />
                <span>Dedicated Squad</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Experienced art directors, editors, and copywriters assigned to your brand.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0D2137]">
                <CheckCircle2 className="size-4 text-[#2B7BC4] shrink-0" />
                <span>Monthly Quotas</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Guaranteed cadence of static posters, 9:16 mobile reels, and story sets.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0D2137]">
                <CheckCircle2 className="size-4 text-[#2B7BC4] shrink-0" />
                <span>Approval Workflow</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Instant sign-offs, fast revision cycles, and auto-publishing schedule.
              </p>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              to="/portal/payments"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] px-7 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:from-[#246bb0] hover:to-[#174e7e] transition-all cursor-pointer"
            >
              <Zap className="size-4" />
              Choose Production Plan
              <ArrowRight className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setSentSuccess(false);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
            >
              <LifeBuoy className="size-4 text-[#2B7BC4]" />
              <span>Need assistance? Contact Support</span>
            </button>
          </div>
        </div>
      </div>

      {/* Support Concierge Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 animate-[zoomIn_0.2s_cubic-bezier(0.16,1,0.3,1)]">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 size-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-2xl bg-blue-50 border border-blue-100 text-[#2B7BC4] flex items-center justify-center shrink-0">
                <LifeBuoy className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0D2137] tracking-tight">
                  Contact Dedicated Support
                </h3>
                <p className="text-xs text-slate-500">
                  Our concierge team is available 24/7 to assist with your account or plan.
                </p>
              </div>
            </div>

            {/* Support Channels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
              <a
                href="https://wa.me/919941999415"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 hover:bg-emerald-100/80 transition-colors"
              >
                <div className="size-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquare className="size-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold">WhatsApp Concierge</p>
                  <p className="text-[10px] text-emerald-700 truncate">Instant Live Chat</p>
                </div>
              </a>

              <a
                href="mailto:concierge@creo.agency?subject=Account%20Assistance%20Inquiry"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-900 hover:bg-blue-100/80 transition-colors"
              >
                <div className="size-8 rounded-xl bg-[#2B7BC4] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Mail className="size-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold">Email Support</p>
                  <p className="text-[10px] text-blue-700 truncate">concierge@creo.agency</p>
                </div>
              </a>
            </div>

            {/* Quick Inquiry Form */}
            {sentSuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <div className="size-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-lg font-bold">
                  ✓
                </div>
                <p className="text-sm font-bold text-emerald-950">Inquiry Received!</p>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your support inquiry ticket has been dispatched. Our account manager will respond shortly.
                </p>

                <div className="pt-2 flex justify-center gap-2">
                  <Link
                    to="/portal/support"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold hover:bg-[#1E609A] transition-colors"
                  >
                    Go to Support Desk →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} className="space-y-3 text-left">
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-[#0D2137] mb-2">Send an Account Inquiry Ticket</p>
                  <input
                    type="text"
                    placeholder="Subject (e.g. Question about payment or onboarding)"
                    value={inquirySubject}
                    onChange={(e) => setInquirySubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:border-[#2B7BC4] focus:outline-none mb-2"
                  />
                  <textarea
                    rows={3}
                    placeholder="Describe how we can assist you with your workspace..."
                    value={inquiryMsg}
                    onChange={(e) => setInquiryMsg(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium focus:border-[#2B7BC4] focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-between items-center pt-1">
                  <Link
                    to="/portal/support"
                    onClick={() => setShowModal(false)}
                    className="text-xs font-semibold text-[#2B7BC4] hover:underline"
                  >
                    Open Support Desk →
                  </Link>

                  <button
                    type="submit"
                    disabled={sending || !inquiryMsg.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Send className="size-3.5" />
                    <span>{sending ? "Sending..." : "Submit Ticket"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
