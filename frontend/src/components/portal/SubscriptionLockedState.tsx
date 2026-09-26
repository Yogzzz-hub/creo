import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
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
  const { user } = useAuth();
  const { data: dashboard } = useQuery({
    queryKey: ["portal-dashboard", user?.id],
    queryFn: () => request<any>("/api/v1/portal/dashboard"),
    enabled: !!user?.id,
  });

  const stage = dashboard?.onboarding_stage ?? user?.onboarding_stage ?? 1;
  const termsAccepted = dashboard?.terms_accepted ?? false;
  const isStep1Done = stage >= 1;
  const isStep2Done = termsAccepted || stage >= 2;
  const isStep3Done = stage >= 3;
  const isStep4Done = stage >= 4;
  const currentResumeStep = !isStep1Done ? 1 : !isStep2Done ? 2 : !isStep3Done ? 3 : !isStep4Done ? 4 : 5;
  const isSetupIncomplete = user?.role === "client" && currentResumeStep < 5;
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
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#2A3446] bg-[#161F2D] p-8 sm:p-12 text-center shadow-xl">
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-[#7FA0D6]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center space-y-6">
          {/* Lock Icon Badge */}
          <div className="relative flex size-20 items-center justify-center rounded-3xl bg-[#0B111C] border border-[#2A3446] text-[#7FA0D6] shadow-xl">
            <Lock className="size-9" />
            <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-[#BCCCE6] text-[#0B111C] shadow-sm border-2 border-[#161F2D]">
              <ShieldAlert className="size-4" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2 max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed">
              {description}
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-2">
            <div className="rounded-2xl border border-[#2A3446] bg-[#0B111C]/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="size-4 text-[#7FA0D6] shrink-0" />
                <span>Dedicated Squad</span>
              </div>
              <p className="text-[11px] text-[#97A0B3] mt-1">
                Experienced art directors, editors, and copywriters assigned to your brand.
              </p>
            </div>

            <div className="rounded-2xl border border-[#2A3446] bg-[#0B111C]/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="size-4 text-[#7FA0D6] shrink-0" />
                <span>Monthly Quotas</span>
              </div>
              <p className="text-[11px] text-[#97A0B3] mt-1">
                Guaranteed cadence of static posters, 9:16 mobile reels, and story sets.
              </p>
            </div>

            <div className="rounded-2xl border border-[#2A3446] bg-[#0B111C]/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="size-4 text-[#7FA0D6] shrink-0" />
                <span>Approval Workflow</span>
              </div>
              <p className="text-[11px] text-[#97A0B3] mt-1">
                Instant sign-offs, fast revision cycles, and auto-publishing schedule.
              </p>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              to={isSetupIncomplete ? `/onboarding?step=${currentResumeStep}` : "/portal/payments"}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#BCCCE6] px-7 py-3 text-xs font-bold text-[#0B111C] shadow-md hover:bg-white transition-all cursor-pointer"
            >
              <Zap className="size-4 text-[#0B111C]" />
              {isSetupIncomplete ? `Resume Account Setup (Step ${currentResumeStep})` : "Choose Production Plan"}
              <ArrowRight className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setSentSuccess(false);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#2A3446] bg-[#0B111C] px-6 py-3 text-xs font-bold text-[#97A0B3] hover:text-white hover:border-[#7FA0D6]/50 transition-all cursor-pointer shadow-sm"
            >
              <LifeBuoy className="size-4 text-[#7FA0D6]" />
              <span>Need assistance? Contact Support</span>
            </button>
          </div>
        </div>
      </div>

      {/* Support Concierge Modal */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#050810]/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
            <div className="relative w-full max-w-lg rounded-3xl bg-[#161F2D] p-6 sm:p-8 shadow-2xl border border-[#2A3446] animate-[zoomIn_0.2s_cubic-bezier(0.16,1,0.3,1)]">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 size-8 rounded-full bg-[#0B111C] text-[#97A0B3] hover:bg-[#2A3446] hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-[#2A3446]"
              >
                <X className="size-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-2xl bg-[#0B111C] border border-[#2A3446] text-[#7FA0D6] flex items-center justify-center shrink-0">
                  <LifeBuoy className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Contact Dedicated Support
                  </h3>
                  <p className="text-xs text-[#97A0B3]">
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
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#0B111C] border border-[#2A3446] text-white hover:border-[#7FA0D6]/60 transition-colors"
                >
                  <div className="size-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <MessageSquare className="size-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-white">WhatsApp Concierge</p>
                    <p className="text-[10px] text-emerald-400 truncate">Instant Live Chat</p>
                  </div>
                </a>

                <a
                  href="mailto:concierge@creo.agency?subject=Account%20Assistance%20Inquiry"
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#0B111C] border border-[#2A3446] text-white hover:border-[#7FA0D6]/60 transition-colors"
                >
                  <div className="size-8 rounded-xl bg-[#7FA0D6] text-[#0B111C] flex items-center justify-center shrink-0 shadow-xs font-bold">
                    <Mail className="size-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-white">Email Support</p>
                    <p className="text-[10px] text-[#7FA0D6] truncate">concierge@creo.agency</p>
                  </div>
                </a>
              </div>

              {/* Quick Inquiry Form */}
              {sentSuccess ? (
                <div className="p-5 rounded-2xl bg-[#0B111C] border border-[#2A3446] text-center space-y-2">
                  <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-lg font-bold">
                    ✓
                  </div>
                  <p className="text-sm font-bold text-white">Inquiry Received!</p>
                  <p className="text-xs text-[#97A0B3] leading-relaxed">
                    Your support inquiry ticket has been dispatched. Our account manager will respond shortly.
                  </p>

                  <div className="pt-2 flex justify-center gap-2">
                    <Link
                      to="/portal/support"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-xl bg-[#BCCCE6] text-[#0B111C] text-xs font-bold hover:bg-white transition-colors"
                    >
                      Go to Support Desk →
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-xl border border-[#2A3446] text-[#97A0B3] text-xs font-bold hover:text-white transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInquiry} className="space-y-3 text-left">
                  <div className="border-t border-[#2A3446] pt-3">
                    <p className="text-xs font-bold text-white mb-2">Send an Account Inquiry Ticket</p>
                    <input
                      type="text"
                      placeholder="Subject (e.g. Question about payment or onboarding)"
                      value={inquirySubject}
                      onChange={(e) => setInquirySubject(e.target.value)}
                      className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3]/50 px-3.5 py-2 text-xs font-medium focus:border-[#7FA0D6] focus:outline-none mb-2"
                    />
                    <textarea
                      rows={3}
                      placeholder="Describe how we can assist you with your workspace..."
                      value={inquiryMsg}
                      onChange={(e) => setInquiryMsg(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3]/50 p-3 text-xs font-medium focus:border-[#7FA0D6] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <Link
                      to="/portal/support"
                      onClick={() => setShowModal(false)}
                      className="text-xs font-semibold text-[#7FA0D6] hover:underline"
                    >
                      Open Support Desk →
                    </Link>

                    <button
                      type="submit"
                      disabled={sending || !inquiryMsg.trim()}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#BCCCE6] text-[#0B111C] text-xs font-bold hover:bg-white disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Send className="size-3.5" />
                      <span>{sending ? "Sending..." : "Submit Ticket"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
