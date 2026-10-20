import React, { useState } from "react";
import { Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Send,
  X,
  Plus,
  ShieldAlert,
  ArrowRight,
  PhoneCall,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { PlanBargainCallModal } from "../../components/portal/PlanBargainCallModal";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";
import type { TicketItem } from "../../types/api";

interface SupportTicketData {
  id: string;
  status: "in_progress" | "resolved" | "open";
  priority: "urgent" | "medium" | "high" | "low";
  priorityLabel: string;
  timeAgo: string;
  title: string;
  description: string;
  meta: string;
  category?: string;
  messages?: Array<{ id: string; sender: string; text: string; time: string; isMe?: boolean }>;
  rawId?: string;
}

const CATEGORIES = ["Content", "Billing", "Technical", "Brand", "Other"];

// Stable fallback: a fresh [] each render would re-trigger the ticket sync effect forever
const NO_TICKETS: TicketItem[] = [];

const FAQ_ITEMS = [
  { q: "How do I request changes on a deliverable?", a: "In the Review section, select 'Request change' and describe your feedback. Your dedicated creative pod will deliver an updated version within your plan's turnaround SLA." },
  { q: "What happens if I miss a review deadline?", a: "Deliverables undergo standard 5-business-day auto-approval to keep production on cadence. You will receive notifications before auto-approval occurs." },
  { q: "Can I add more reels or posts mid-cycle?", a: "Yes! You can purchase Add-on top-up packs directly from the Plan & billing page. They apply immediately to your current cycle." },
  { q: "How do revision rounds work per plan?", a: "Revision rounds per deliverable depend on your plan: 1 round for Starter, 2 rounds for Growth, and 3 rounds for Scale. Leaving clear feedback ensures your pod gets it right on the next iteration." },
  { q: "What are the SLA turnaround promises per plan?", a: "Starter features 3 business days turnaround per deliverable batch, Growth offers 2 business days, and Scale offers 24-hour priority turnaround." },
];

export function PortalSupportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subData, isLoading: isSubLoading } = useQuery({
    queryKey: ["client-subscription", user?.id],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
  });

  const isExpired =
    subData?.is_expired === true ||
    subData?.subscription?.status === "expired" ||
    subData?.subscription?.status === "canceled";
  const isStaffOrAdmin = user?.role && user.role !== "client";

  const { data: serverTickets = NO_TICKETS, isLoading: isTicketsLoading } = useQuery<TicketItem[]>({
    queryKey: ["tickets", user?.id],
    queryFn: async () => {
      try {
        const res = await request<any>("/api/v1/tickets");
        return res?.items ?? (Array.isArray(res) ? res : []);
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 2 * 60_000,
  });

  // Local state
  const [ticketsList, setTicketsList] = useState<SupportTicketData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Content");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [bargainModalOpen, setBargainModalOpen] = useState(false);
  const [mobileRequestsOpen, setMobileRequestsOpen] = useState(true);
  const [mobileFaqOpen, setMobileFaqOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<"new_request" | "history_faq">("new_request");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };



  // Sync server tickets
  React.useEffect(() => {
    const safeTickets = (Array.isArray(serverTickets) ? serverTickets : []);
    if (safeTickets.length > 0) {
      const mapped: SupportTicketData[] = safeTickets.map((t: any) => ({
        rawId: t?.id,
        id: `#TKT-${String(t?.id || "").slice(0, 4).toUpperCase()}`,
        status: (t?.status === "resolved" || t?.status === "closed" ? "resolved" : t?.status === "in_progress" ? "in_progress" : "open") as any,
        priority: ((t?.priority as any) || "medium") as any,
        priorityLabel: t?.priority === "urgent" ? "Urgent" : t?.priority === "high" ? "High" : t?.priority === "low" ? "Low" : "Medium",
        timeAgo: t?.created_at ? new Date(t.created_at).toLocaleDateString() : "Recently",
        title: t?.title || "General Support Thread",
        description: t?.description || "",
        meta: `Opened by ${user?.full_name || "You"}`,
        category: "General",
      }));
      setTicketsList(mapped);
    } else {
      setTicketsList([]);
    }
  }, [serverTickets, user]);

  const createTicketMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; priority: string }) => {
      return await request("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      showToast(`Ticket submitted successfully!`);
      setSubject("");
      setDescription("");
    },
    onError: (error: any) => {
      showToast(`Failed to create ticket: ${error.message || "Validation Error"}`);
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createTicketMutation.isPending) return;
    if (!subject.trim() || !description.trim()) {
      showToast("Please fill in both subject and description.");
      return;
    }

    createTicketMutation.mutate({ title: subject.trim(), description: description.trim(), priority: "medium" });
  };

  if (isSubLoading || isTicketsLoading) {
    return <CreoLoadingScreen fullScreen={false} label="Loading Support Desk" className="min-h-[45vh]" />;
  }

  return (
    <div className="w-full space-y-4 pb-4 min-w-0">


      {/* ── Retainer Notice Banner (Informative & Actionable, Never Blocking Support) ── */}
      {isExpired && !isStaffOrAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Retainer Subscription Inactive or Expired</h4>
              <p className="text-xs text-[#97A0B3] mt-0.5">
                Deliverable pipelines and asset reviews are currently paused. Our support desk is 100% active to assist you with renewal, custom quota arrangements, or billing questions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setBargainModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-[#7FA0D6] text-xs font-bold cursor-pointer transition-colors enabled:hover:bg-[#293D58] enabled:hover:border-[#9CB8E5] enabled:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161F2D]"
            >
              <PhoneCall className="size-3.5" />
              <span>Call & Bargain</span>
            </button>
            <Link
              to="/portal/payments"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#BCCCE6] hover:bg-white text-[#0B111C] text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <span>Renew Retainer</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Mobile 2-Tab Segmented Switcher (< md) ── */}
      <div className="grid grid-cols-2 p-1 bg-[#161F2D] rounded-xl border border-[#2A3446] md:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("new_request")}
          className={`py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
            mobileTab === "new_request"
              ? "bg-[#BCCCE6] text-[#0B111C] shadow-sm"
              : "text-[#97A0B3] hover:text-white"
          }`}
        >
          New Request
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("history_faq")}
          className={`py-2 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "history_faq"
              ? "bg-[#BCCCE6] text-[#0B111C] shadow-sm"
              : "text-[#97A0B3] hover:text-white"
          }`}
        >
          <span>History & FAQ</span>
          {ticketsList.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              mobileTab === "history_faq" ? "bg-[#0B111C] text-[#BCCCE6]" : "bg-[#2A3446] text-[#BCCCE6]"
            }`}>
              {ticketsList.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Main Help Section ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 min-w-0">
        {/* ── Left Column: Ask your pod (Form) ── */}
        <div className={`bg-[#161F2D] rounded-xl md:rounded-2xl p-3.5 sm:p-5 border border-[#2A3446] min-w-0 ${
          mobileTab === "new_request" ? "block" : "hidden md:block"
        }`}>
          <h3 className="text-sm sm:text-base font-semibold text-white mb-2.5 sm:mb-3.5">Ask your pod</h3>

          <form onSubmit={handleFormSubmit} className="space-y-3 sm:space-y-3.5 min-w-0">
            {/* Category Pills */}
            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-1.5">What is it about?</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    aria-pressed={selectedCategory === cat}
                    className={`min-h-7 md:min-h-9 px-2.5 md:px-3.5 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-medium cursor-pointer transition-colors ${
                      selectedCategory === cat
                        ? "bg-[#BCCCE6] text-[#0B111C] font-bold hover:bg-[#D2DDF0]"
                        : "bg-transparent border border-[#2A3446] text-[#BCCCE6] hover:bg-[#222D3E] hover:border-[#7FA0D6] hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Input */}
            <div>
              <label htmlFor="support-subject" className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-1">Subject</label>
              <input
                id="support-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Briefly summarize your request..."
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 sm:px-3.5 py-2 text-xs text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]/20 transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="support-message" className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-1">Message</label>
              <textarea
                id="support-message"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue or request..."
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl p-2.5 sm:p-3 text-xs text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]/20 resize-none transition-colors"
              />
            </div>

            {/* Send Button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={createTicketMutation.isPending || !subject.trim() || !description.trim()}
                className="min-h-8 sm:min-h-10 px-4 py-2 gap-2 rounded-xl bg-[#BCCCE6] text-[#0B111C] text-xs font-bold flex items-center justify-center enabled:hover:bg-[#D2DDF0] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTicketMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                {createTicketMutation.isPending ? "Sending..." : "Send request"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Right Column: Your requests + Common questions ── */}
        <div className={`space-y-3 md:space-y-4 min-w-0 ${
          mobileTab === "history_faq" ? "block" : "hidden md:block"
        }`}>
          {/* Your Requests */}
          <div className="bg-[#161F2D] rounded-xl md:rounded-2xl p-3.5 sm:p-5 border border-[#2A3446] min-w-0">
            <div 
              onClick={() => setMobileRequestsOpen(prev => !prev)}
              className="flex items-center justify-between cursor-pointer lg:cursor-default mb-0 lg:mb-3 select-none"
            >
              <h3 className="text-sm sm:text-base font-semibold text-white">Your requests ({ticketsList.length})</h3>
              <div className="lg:hidden text-[#7FA0D6] p-0.5">
                {mobileRequestsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </div>
            </div>

            <div className={`${mobileRequestsOpen ? "block mt-3" : "hidden lg:block"}`}>
              {ticketsList.length === 0 ? (
                <p className="text-xs sm:text-sm text-[#97A0B3] py-3 text-center">No tickets yet. Need help? Raise a Ticket</p>
              ) : (
                <div className="space-y-2 sm:space-y-2.5">
                  {ticketsList.slice(0, 5).map((t) => (
                    <Link key={t.id} to={`/portal/support/${t.rawId}`} className="block p-3 sm:p-3.5 bg-[#0B111C] rounded-xl border border-white/[0.04] hover:border-[#7FA0D6]/30 transition-colors">
                      {/* Top row */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] sm:text-xs font-mono text-[#97A0B3]">{t.id}</span>
                        <span className="text-[11px] sm:text-xs text-[#97A0B3]">· {t.category}</span>
                        <span className="text-[11px] sm:text-xs text-[#97A0B3] ml-auto">{t.timeAgo}</span>
                      </div>
                      {/* Title */}
                      <p className="text-xs sm:text-sm font-medium text-white mb-1.5">{t.title}</p>
                      {/* Status */}
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] sm:text-xs font-medium ${
                          t.status === "resolved"
                            ? "bg-[#7FA0D6]/10 text-[#7FA0D6]"
                            : t.status === "in_progress"
                            ? "bg-[#D8BF9B]/10 text-[#D8BF9B]"
                            : "bg-white/[0.05] text-[#97A0B3]"
                        }`}
                      >
                        {t.status === "resolved"
                          ? "✓ Fixed in v2"
                          : t.status === "in_progress"
                          ? "In progress"
                          : "Waiting on you"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Common Questions (Accordion) */}
          <div className="bg-[#161F2D] rounded-xl md:rounded-2xl p-3.5 sm:p-5 border border-[#2A3446] min-w-0">
            <div 
              onClick={() => setMobileFaqOpen(prev => !prev)}
              className="flex items-center justify-between cursor-pointer lg:cursor-default mb-0 lg:mb-3 select-none"
            >
              <h3 className="text-sm sm:text-base font-semibold text-white">Common questions ({FAQ_ITEMS.length})</h3>
              <div className="lg:hidden text-[#7FA0D6] p-0.5">
                {mobileFaqOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </div>
            </div>

            <div className={`${mobileFaqOpen ? "block mt-2.5" : "hidden lg:block"}`}>
              <div className="divide-y divide-white/[0.05]">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      aria-expanded={expandedFaq === i}
                      aria-controls={`support-faq-${i}`}
                      className="w-full flex items-center justify-between rounded-xl px-2 sm:px-2.5 py-2 sm:py-3 text-left group cursor-pointer transition-colors hover:bg-[#222D3E]"
                    >
                      <span className="text-xs sm:text-sm text-[#97A0B3] group-hover:text-white transition-colors pr-3 sm:pr-4">{item.q}</span>
                      <Plus
                        className={`w-3.5 h-3.5 text-[#97A0B3] shrink-0 transition-transform duration-200 ${
                          expandedFaq === i ? "rotate-45" : ""
                        }`}
                      />
                    </button>
                    {expandedFaq === i && (
                      <div id={`support-faq-${i}`} className="px-2 sm:px-2.5 pb-2.5 sm:pb-3 text-xs sm:text-sm leading-relaxed text-[#97A0B3] animate-in fade-in slide-in-from-top-2">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 max-w-[calc(100vw-2rem)] z-50 bg-[#161F2D] text-white px-5 py-3 rounded-xl shadow-2xl border border-white/[0.1] text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#BCCCE6]" />
          {toastMessage}
          <button type="button" onClick={() => setToastMessage(null)} className="ml-2 text-[#97A0B3] hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Plan Bargain Call Modal */}
      <PlanBargainCallModal
        isOpen={bargainModalOpen}
        onClose={() => setBargainModalOpen(false)}
      />
    </div>
  );
}

export default PortalSupportPage;
